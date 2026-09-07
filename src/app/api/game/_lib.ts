import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchReptilesBase, fetchAbilities, fetchEngineConfig } from "@/lib/supabase/queries";
import { rowToRoom, rowToPlayer, canalDeVista, type RoomRecord, type PlayerRecord } from "@/lib/supabase/game-queries";
import { buildReptil } from "@/lib/game-engine/stats";
import { toPublicView } from "@/lib/card-game/engine";
import type { GameState, Lado } from "@/lib/card-game/types";
import { publicarEnCanal } from "@/lib/supabase/realtime";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import type { EstadoSala } from "@/lib/supabase/types";

/** Roster + habilidades + config reales (mismos datos que el resto de la app), listos para el motor. */
export async function cargarDatosDeJuego() {
  const supabase = createAdminClient();
  const [reptilesBase, abilities, config] = await Promise.all([
    fetchReptilesBase(supabase),
    fetchAbilities(supabase),
    fetchEngineConfig(supabase),
  ]);
  const roster = reptilesBase.map((base) => buildReptil(base, abilities));
  return { roster, abilities, config };
}

export async function obtenerSala(codigo: string): Promise<RoomRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("game_rooms").select("*").eq("codigo", codigo.toUpperCase()).maybeSingle();
  if (error || !data) return null;
  return rowToRoom(data);
}

export async function obtenerJugadoresDeSala(roomId: string): Promise<PlayerRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("game_players").select("*").eq("room_id", roomId);
  if (error || !data) return [];
  return data.map(rowToPlayer);
}

/** Valida que ese sessionId realmente corresponde a un asiento de esa sala, y devuelve su lado. */
export function encontrarAsiento(jugadores: PlayerRecord[], sessionId: string): PlayerRecord | null {
  return jugadores.find((j) => j.sessionId === sessionId) ?? null;
}

interface EmitirOpts {
  ultimoResultado?: Omit<ResultadoAtaque, "state"> | null;
  estadoSala?: EstadoSala;
  ganador?: Lado | null;
}

/**
 * Publica la vista redactada correspondiente a cada jugador en su canal privado.
 * Incluye estadoSala/nombreRival/ganador (no solo `estado`) porque el cliente que ya
 * está suscrito (p. ej. quien espera en WAITING) solo se entera de esos cambios por
 * este broadcast — no vuelve a pedir GET /rooms/[codigo] hasta reconectar.
 */
export async function emitirEstado(estado: GameState, jugadores: PlayerRecord[], opts: EmitirOpts = {}): Promise<void> {
  await Promise.all(
    jugadores.map((j) => {
      const rival = jugadores.find((x) => x.lado !== j.lado);
      return publicarEnCanal(canalDeVista(j.viewToken), "estado", {
        estado: toPublicView(estado, j.lado),
        ultimoResultado: opts.ultimoResultado ?? null,
        estadoSala: opts.estadoSala ?? null,
        nombreRival: rival?.nombre ?? null,
        ganador: opts.ganador ?? null,
      });
    }),
  );
}

export function jsonError(mensaje: string, status = 400) {
  return Response.json({ error: mensaje }, { status });
}
