import { createAdminClient } from "@/lib/supabase/admin";
import { generarCodigoSala, generarViewToken, rowToQueueEntry } from "@/lib/supabase/game-queries";
import { crearPartida } from "@/lib/card-game/engine";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { cargarDatosDeJuego, emitirEstado, jsonError } from "../../_lib";

const EXPIRACION_COLA_MS = 2 * 60 * 1000;

interface QueueJoinBody {
  sessionId: string;
  nombre: string;
  mazo: string[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QueueJoinBody | null;
  if (!body?.sessionId || !body.nombre || !Array.isArray(body.mazo)) return jsonError("Datos inválidos.");
  if (body.mazo.length === 0 || body.mazo.length > MAX_CARTAS_MAZO) {
    return jsonError(`El mazo debe tener entre 1 y ${MAX_CARTAS_MAZO} reptiles.`);
  }

  const { roster, abilities, config } = await cargarDatosDeJuego();
  const idsValidos = new Set(roster.map((r) => r.id));
  if (!body.mazo.every((id) => idsValidos.has(id))) return jsonError("El mazo contiene reptiles inválidos.");

  const supabase = createAdminClient();

  // Limpieza oportunista de entradas viejas sin emparejar (nadie las reclamó a tiempo).
  await supabase
    .from("matchmaking_queue")
    .delete()
    .is("emparejado_codigo", null)
    .lt("creado_en", new Date(Date.now() - EXPIRACION_COLA_MS).toISOString());

  const codigoPropuesto = generarCodigoSala();
  const { data: reclamado } = await supabase
    .from("matchmaking_queue")
    .update({ emparejado_codigo: codigoPropuesto })
    .is("emparejado_codigo", null)
    .neq("session_id", body.sessionId)
    .order("creado_en", { ascending: true })
    .limit(1)
    .select("*");

  const oponente = reclamado && reclamado.length > 0 ? rowToQueueEntry(reclamado[0]) : null;

  if (!oponente) {
    const { error } = await supabase.from("matchmaking_queue").insert({
      session_id: body.sessionId,
      nombre: body.nombre,
      mazo: body.mazo,
    });
    if (error) return jsonError(error.message, 500);
    return Response.json({ esperando: true });
  }

  // Emparejado: el oponente que ya esperaba pasa a ser el lado A (llegó primero).
  const estadoInicial = crearPartida(oponente.mazo, body.mazo, roster, abilities, config, oponente.nombre, body.nombre);
  const viewTokenA = generarViewToken();
  const viewTokenB = generarViewToken();

  const { data: sala, error: errorSala } = await supabase
    .from("game_rooms")
    .insert({
      codigo: codigoPropuesto,
      modo: "aleatorio",
      estado_sala: "IN_PROGRESS",
      mazo_a: oponente.mazo,
      mazo_b: body.mazo,
      estado: estadoInicial,
    })
    .select("id")
    .single();
  if (errorSala || !sala) return jsonError(errorSala?.message ?? "No se pudo crear la partida.", 500);

  const { error: errorJugadores } = await supabase.from("game_players").insert([
    { room_id: sala.id, nombre: oponente.nombre, lado: "A", session_id: oponente.sessionId, view_token: viewTokenA },
    { room_id: sala.id, nombre: body.nombre, lado: "B", session_id: body.sessionId, view_token: viewTokenB },
  ]);
  if (errorJugadores) return jsonError(errorJugadores.message, 500);

  await emitirEstado(
    estadoInicial,
    [
      { id: "", roomId: sala.id, nombre: oponente.nombre, lado: "A", sessionId: oponente.sessionId, viewToken: viewTokenA, lastSeen: new Date().toISOString() },
      { id: "", roomId: sala.id, nombre: body.nombre, lado: "B", sessionId: body.sessionId, viewToken: viewTokenB, lastSeen: new Date().toISOString() },
    ],
    { estadoSala: "IN_PROGRESS" },
  );

  return Response.json({ codigo: codigoPropuesto, viewToken: viewTokenB });
}
