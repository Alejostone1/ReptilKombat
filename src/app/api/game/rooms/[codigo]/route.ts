import { obtenerSala, obtenerJugadoresDeSala, encontrarAsiento, jsonError } from "../../_lib";
import { toPublicView } from "@/lib/card-game/engine";
import { vistaSala2v2 } from "../../_equipos";

interface Params {
  params: Promise<{ codigo: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { codigo } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return jsonError("Falta sessionId.");

  const sala = await obtenerSala(codigo);
  if (!sala) return jsonError("Sala no encontrada.", 404);

  const jugadores = await obtenerJugadoresDeSala(sala.id);
  const yo = encontrarAsiento(jugadores, sessionId);
  if (!yo) return jsonError("No perteneces a esta sala.", 403);

  if (sala.formato === "2v2") return vistaSala2v2(sala, jugadores, yo);

  const rival = jugadores.find((j) => j.lado !== yo.lado) ?? null;

  return Response.json({
    codigo: sala.codigo,
    estadoSala: sala.estadoSala,
    lado: yo.lado,
    viewToken: yo.viewToken,
    nombrePropio: yo.nombre,
    nombreRival: rival?.nombre ?? null,
    estado: sala.estado ? toPublicView(sala.estado, yo.lado) : null,
    ganador: sala.ganador,
  });
}
