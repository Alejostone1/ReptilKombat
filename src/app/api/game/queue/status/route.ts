import { createAdminClient } from "@/lib/supabase/admin";
import { rowToPlayer } from "@/lib/supabase/game-queries";
import { jsonError } from "../../_lib";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return jsonError("Falta sessionId.");

  const supabase = createAdminClient();
  const { data: entrada } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!entrada) return Response.json({ emparejado: false });
  if (!entrada.emparejado_codigo) return Response.json({ emparejado: false });

  // Ya lo emparejaron: recupera su viewToken de la sala recién creada y limpia la cola.
  const codigo = entrada.emparejado_codigo as string;
  const { data: sala } = await supabase.from("game_rooms").select("id").eq("codigo", codigo).maybeSingle();
  let viewToken: string | null = null;
  if (sala) {
    const { data: jugadores } = await supabase.from("game_players").select("*").eq("room_id", sala.id);
    const yo = jugadores?.map(rowToPlayer).find((j) => j.sessionId === sessionId);
    viewToken = yo?.viewToken ?? null;
  }

  await supabase.from("matchmaking_queue").delete().eq("session_id", sessionId);

  return Response.json({ emparejado: true, codigo, viewToken });
}
