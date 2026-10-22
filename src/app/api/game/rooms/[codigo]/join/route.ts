import { createAdminClient } from "@/lib/supabase/admin";
import { generarViewToken } from "@/lib/supabase/game-queries";
import { crearPartida } from "@/lib/card-game/engine";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { salaVencida } from "@/lib/card-game/conexion";
import { cargarDatosDeJuego, obtenerSala, obtenerJugadoresDeSala, emitirEstado, jsonError } from "../../../_lib";

interface Params {
  params: Promise<{ codigo: string }>;
}

interface UnirseBody {
  sessionId: string;
  nombre: string;
  mazo: string[];
}

export async function POST(request: Request, { params }: Params) {
  const { codigo } = await params;
  const body = (await request.json().catch(() => null)) as UnirseBody | null;
  if (!body?.sessionId || !body.nombre || !Array.isArray(body.mazo)) return jsonError("Datos inválidos.");
  if (body.mazo.length === 0 || body.mazo.length > MAX_CARTAS_MAZO) {
    return jsonError(`El mazo debe tener entre 1 y ${MAX_CARTAS_MAZO} reptiles.`);
  }

  const sala = await obtenerSala(codigo);
  if (!sala) return jsonError("No existe una partida con ese código.", 404);
  if (sala.estadoSala === "CANCELLED") return jsonError("Esa partida fue cancelada.", 409);
  if (sala.estadoSala !== "WAITING") return jsonError("Esa partida ya no acepta jugadores.", 409);
  if (salaVencida(sala.expiraEn, Date.now())) return jsonError("Esa sala venció. Pídele a tu rival que cree una nueva.", 410);
  if (!sala.mazoA) return jsonError("La sala no tiene un mazo válido.", 500);

  const jugadoresActuales = await obtenerJugadoresDeSala(sala.id);
  if (jugadoresActuales.some((j) => j.lado === "B")) return jsonError("Esa partida ya tiene dos jugadores.", 409);

  // El servidor nunca confía en los ids de mazo que llegan del cliente: valida que existan de verdad.
  const { roster, abilities, config } = await cargarDatosDeJuego();
  const idsValidos = new Set(roster.map((r) => r.id));
  if (!body.mazo.every((id) => idsValidos.has(id))) return jsonError("El mazo contiene reptiles inválidos.");

  const viewToken = generarViewToken();
  const supabase = createAdminClient();

  const { error: errorJugador } = await supabase.from("game_players").insert({
    room_id: sala.id,
    nombre: body.nombre,
    lado: "B",
    session_id: body.sessionId,
    view_token: viewToken,
  });
  if (errorJugador) return jsonError(errorJugador.message, 500);

  const nombreA = jugadoresActuales.find((j) => j.lado === "A")?.nombre ?? "Jugador A";
  const estadoInicial = crearPartida(sala.mazoA, body.mazo, roster, abilities, config, nombreA, body.nombre);

  const { error: errorSala } = await supabase
    .from("game_rooms")
    .update({ mazo_b: body.mazo, estado: estadoInicial, estado_sala: "IN_PROGRESS" })
    .eq("id", sala.id);
  if (errorSala) return jsonError(errorSala.message, 500);

  // Al empezar, los dos cuentan como "vistos ahora": el creador pudo esperar minutos sin partida en curso.
  await supabase.from("game_players").update({ last_seen: new Date().toISOString() }).eq("room_id", sala.id);

  const jugadores = [...jugadoresActuales, { id: "", roomId: sala.id, nombre: body.nombre, lado: "B" as const, sessionId: body.sessionId, viewToken, lastSeen: new Date().toISOString() }];
  await emitirEstado(estadoInicial, jugadores, { estadoSala: "IN_PROGRESS" });

  return Response.json({ viewToken });
}
