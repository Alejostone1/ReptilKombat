import "server-only";

/**
 * Publica un evento en un canal de Supabase Realtime desde el servidor, vía
 * el endpoint REST de broadcast (sin mantener una conexión websocket abierta
 * en un Route Handler serverless — no aplica mantener un socket vivo entre
 * invocaciones). Cualquier cliente suscrito a ese `topic` por websocket
 * (`supabase.channel(topic).on('broadcast', ...)`) recibe el mensaje igual.
 */
export async function publicarEnCanal(topic: string, event: string, payload: unknown): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");

  const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`No se pudo publicar en Realtime (${res.status}): ${detalle}`);
  }
}
