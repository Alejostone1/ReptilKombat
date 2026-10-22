import { createAdminClient } from "@/lib/supabase/admin";
import { generarCodigoSala, generarViewToken } from "@/lib/supabase/game-queries";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { MINUTOS_VIGENCIA_SALA } from "@/lib/card-game/conexion";
import { cargarDatosDeJuego, jsonError } from "../_lib";

interface CrearSalaBody {
  sessionId: string;
  nombre: string;
  mazo: string[];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CrearSalaBody | null;
  if (!body?.sessionId || !body.nombre || !Array.isArray(body.mazo)) {
    return jsonError("Datos inválidos.");
  }
  if (body.mazo.length === 0 || body.mazo.length > MAX_CARTAS_MAZO) {
    return jsonError(`El mazo debe tener entre 1 y ${MAX_CARTAS_MAZO} reptiles.`);
  }

  const { roster } = await cargarDatosDeJuego();
  const idsValidos = new Set(roster.map((r) => r.id));
  if (!body.mazo.every((id) => idsValidos.has(id))) return jsonError("El mazo contiene reptiles inválidos.");

  const supabase = createAdminClient();
  const viewToken = generarViewToken();

  // Reintenta si el código generado ya existe (colisión extremadamente rara con 6 caracteres).
  let codigo = generarCodigoSala();
  for (let intento = 0; intento < 5; intento++) {
    const { data: existente } = await supabase.from("game_rooms").select("id").eq("codigo", codigo).maybeSingle();
    if (!existente) break;
    codigo = generarCodigoSala();
  }

  const { data: sala, error: errorSala } = await supabase
    .from("game_rooms")
    .insert({
      codigo,
      modo: "amigo",
      estado_sala: "WAITING",
      mazo_a: body.mazo,
      estado: null,
      expira_en: new Date(Date.now() + MINUTOS_VIGENCIA_SALA * 60_000).toISOString(),
    })
    .select("id")
    .single();

  if (errorSala || !sala) return jsonError(errorSala?.message ?? "No se pudo crear la sala.", 500);

  const { error: errorJugador } = await supabase.from("game_players").insert({
    room_id: sala.id,
    nombre: body.nombre,
    lado: "A",
    session_id: body.sessionId,
    view_token: viewToken,
  });

  if (errorJugador) return jsonError(errorJugador.message, 500);

  return Response.json({ codigo, viewToken });
}
