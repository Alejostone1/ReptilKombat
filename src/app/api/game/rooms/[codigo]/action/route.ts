import { createAdminClient } from "@/lib/supabase/admin";
import { invocar, atacar, cambiar, toPublicView } from "@/lib/card-game/engine";
import { FEATURES } from "@/config/features";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import type { GameState } from "@/lib/card-game/types";
import {
  cargarDatosDeJuego,
  obtenerSala,
  obtenerJugadoresDeSala,
  encontrarAsiento,
  emitirEstado,
  jsonError,
} from "../../../_lib";

interface Params {
  params: Promise<{ codigo: string }>;
}

type Accion = { tipo: "invocar"; reptilId: string } | { tipo: "atacar"; habilidadId: string } | { tipo: "cambiar"; reptilId: string };

interface AccionBody {
  sessionId: string;
  accion: Accion;
}

export async function POST(request: Request, { params }: Params) {
  const { codigo } = await params;
  const body = (await request.json().catch(() => null)) as AccionBody | null;
  if (!body?.sessionId || !body.accion) return jsonError("Datos inválidos.");

  const sala = await obtenerSala(codigo);
  if (!sala) return jsonError("Sala no encontrada.", 404);
  if (sala.estadoSala !== "IN_PROGRESS" || !sala.estado) return jsonError("Esa partida no está en curso.", 409);

  const jugadores = await obtenerJugadoresDeSala(sala.id);
  const yo = encontrarAsiento(jugadores, body.sessionId);
  if (!yo) return jsonError("No perteneces a esta sala.", 403);

  const estadoActual = sala.estado;
  // El servidor es la autoridad del turno: rechaza cualquier acción que no corresponda al lado del sessionId.
  if (estadoActual.turno !== yo.lado) return jsonError("No es tu turno.", 409);

  const { roster, abilities, config } = await cargarDatosDeJuego();

  let nuevoEstado: GameState;
  let ultimoResultado: Omit<ResultadoAtaque, "state"> | null = null;

  try {
    if (body.accion.tipo === "invocar") {
      nuevoEstado = invocar(estadoActual, body.accion.reptilId, roster);
    } else if (body.accion.tipo === "cambiar") {
      if (!FEATURES.CARD_SWAP) return jsonError("El cambio de carta no está disponible.", 400);
      nuevoEstado = cambiar(estadoActual, body.accion.reptilId, roster);
    } else {
      const { state, ...resto } = atacar(estadoActual, body.accion.habilidadId, roster, abilities, config);
      nuevoEstado = state;
      ultimoResultado = resto;
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Acción inválida.", 400);
  }

  const supabase = createAdminClient();
  const terminado = nuevoEstado.fase === "terminado";
  const { error } = await supabase
    .from("game_rooms")
    .update({
      estado: nuevoEstado,
      estado_sala: terminado ? "FINISHED" : "IN_PROGRESS",
      ganador: nuevoEstado.ganador,
      finalizado_en: terminado ? new Date().toISOString() : null,
    })
    .eq("id", sala.id);
  if (error) return jsonError(error.message, 500);

  await supabase.from("game_players").update({ last_seen: new Date().toISOString() }).eq("id", yo.id);
  await supabase.from("game_moves").insert({ room_id: sala.id, lado: yo.lado, accion: body.accion });

  // Analítica real de balance (nunca simulada): un registro por partida online terminada,
  // usado por /admin/balance para calcular win rate / partidas jugadas por reptil.
  if (terminado && nuevoEstado.ganador) {
    const duracionSegundos = Math.max(0, Math.round((Date.now() - new Date(sala.creadoEn).getTime()) / 1000));
    await supabase.from("match_results").insert({
      room_id: sala.id,
      ganador_lado: nuevoEstado.ganador,
      reptiles_a: sala.mazoA ?? [],
      reptiles_b: sala.mazoB ?? [],
      turnos: nuevoEstado.numeroTurno,
      duracion_segundos: duracionSegundos,
    });
  }

  await emitirEstado(nuevoEstado, jugadores, {
    ultimoResultado,
    estadoSala: terminado ? "FINISHED" : "IN_PROGRESS",
    ganador: nuevoEstado.ganador,
  });

  return Response.json({ estado: toPublicView(nuevoEstado, yo.lado), ultimoResultado });
}
