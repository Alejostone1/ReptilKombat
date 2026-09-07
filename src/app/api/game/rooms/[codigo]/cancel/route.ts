import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerSala, obtenerJugadoresDeSala, encontrarAsiento, jsonError } from "../../../_lib";

interface Params {
  params: Promise<{ codigo: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { codigo } = await params;
  const body = (await request.json().catch(() => null)) as { sessionId: string } | null;
  if (!body?.sessionId) return jsonError("Datos inválidos.");

  const sala = await obtenerSala(codigo);
  if (!sala) return jsonError("Sala no encontrada.", 404);
  if (sala.estadoSala !== "WAITING") return jsonError("Solo se puede cancelar una sala que aún espera oponente.", 409);

  const jugadores = await obtenerJugadoresDeSala(sala.id);
  const yo = encontrarAsiento(jugadores, body.sessionId);
  if (!yo || yo.lado !== "A") return jsonError("Solo quien creó la sala puede cancelarla.", 403);

  const supabase = createAdminClient();
  const { error } = await supabase.from("game_rooms").update({ estado_sala: "CANCELLED" }).eq("id", sala.id);
  if (error) return jsonError(error.message, 500);

  return Response.json({ ok: true });
}
