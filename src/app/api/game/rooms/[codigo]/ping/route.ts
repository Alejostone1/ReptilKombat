import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerSala, obtenerJugadoresDeSala, encontrarAsiento, emitirEstado, jsonError } from "../../../_lib";
import { evaluarDesconexion } from "@/lib/card-game/conexion";

interface Params {
  params: Promise<{ codigo: string }>;
}

/**
 * Latido del cliente (cada ~15 s). Marca `last_seen` y, de forma perezosa (sin cron: Vercel es
 * serverless), comprueba si el rival lleva más de 60 s sin señal: en ese caso la partida termina y
 * gana quien sigue conectado.
 */
export async function POST(request: Request, { params }: Params) {
  const { codigo } = await params;
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) return jsonError("Falta sessionId.");

  const sala = await obtenerSala(codigo);
  if (!sala) return jsonError("Sala no encontrada.", 404);
  const jugadores = await obtenerJugadoresDeSala(sala.id);
  const yo = encontrarAsiento(jugadores, body.sessionId);
  if (!yo) return jsonError("No perteneces a esta sala.", 403);

  const supabase = createAdminClient();
  const ahora = Date.now();
  await supabase.from("game_players").update({ last_seen: new Date(ahora).toISOString() }).eq("id", yo.id);

  const respuesta = { estadoSala: sala.estadoSala, ganador: sala.ganador, rivalSegundosSinSenal: 0 };
  if (sala.estadoSala !== "IN_PROGRESS" || !sala.estado) return Response.json(respuesta);

  const ev = evaluarDesconexion(
    jugadores.map((j) => (j.id === yo.id ? { ...j, lastSeen: new Date(ahora).toISOString() } : j)),
    yo.lado,
    ahora,
  );
  if (!ev.abandona) return Response.json({ ...respuesta, rivalSegundosSinSenal: ev.segundosSinSenalRival });

  // El rival abandonó: gana quien sigue aquí. El filtro por estado evita doble cierre si dos pings coinciden.
  const rival = jugadores.find((j) => j.lado === ev.abandona);
  const estadoFinal = {
    ...sala.estado,
    fase: "terminado" as const,
    ganador: yo.lado,
    log: [
      ...sala.estado.log,
      {
        turno: sala.estado.numeroTurno,
        lado: yo.lado,
        tipo: "victoria" as const,
        mensaje: `${rival?.nombre ?? "El rival"} se desconectó: ${yo.nombre} gana por abandono.`,
      },
    ],
  };
  const { data: cerrada } = await supabase
    .from("game_rooms")
    .update({ estado: estadoFinal, estado_sala: "FINISHED", ganador: yo.lado, finalizado_en: new Date(ahora).toISOString() })
    .eq("id", sala.id)
    .eq("estado_sala", "IN_PROGRESS")
    .select("id");

  if (cerrada && cerrada.length > 0) {
    await emitirEstado(estadoFinal, jugadores, { estadoSala: "FINISHED", ganador: yo.lado });
  }
  return Response.json({ estadoSala: "FINISHED", ganador: yo.lado, rivalSegundosSinSenal: ev.segundosSinSenalRival });
}
