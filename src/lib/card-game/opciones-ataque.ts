import type { Reptil } from "@/types/reptile";
import type { Habilidad, CategoriaHabilidad } from "@/types/ability";
import type { MatchupTier } from "@/types/affinity";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { CartaEnJuego, Configuracion, GameState } from "./types";
import { puedeUsarHabilidad, reptilDesdeStats, multiplicadorEstado } from "./engine";

export interface OpcionAtaque {
  habilidad: Habilidad;
  tier: MatchupTier;
  disponible: boolean;
  cooldownRestante: number;
  /** Daño esperado (sin variación ni crítico). SOLO para mostrar si HIDE_ATTACK_DAMAGE está apagada. */
  danoEstimado: number;
}

const ORDEN_CATEGORIA: Record<CategoriaHabilidad, number> = { Fisica: 0, Tecnica: 1, Control: 2, Estado: 3 };

/**
 * Opciones de ataque del jugador en turno. Lee siempre del snapshot congelado en
 * `state.configuracion` (nunca del roster en vivo) para no desincronizarse de lo que `atacar()` aplica.
 * Con el daño oculto el orden es fijo por categoría (si se ordenara por daño, la lista delataría
 * cuál pega más) y NO depende de disponibilidad, para que los botones no cambien de sitio.
 */
export function opcionesDeAtaque(state: GameState, abilities: Habilidad[], config: EngineConfig, ocultarDano: boolean): OpcionAtaque[] {
  const lado = state.turno;
  const propio = lado === "A" ? state.jugadorA : state.jugadorB;
  const rival = lado === "A" ? state.jugadorB : state.jugadorA;
  if (!propio.activo || !rival.activo) return [];
  return opcionesContra(propio.activo, rival.activo, state.configuracion, abilities, config, ocultarDano);
}

/** Núcleo compartido (1 vs 1 y 2 vs 2): opciones de la carta `propio` atacando a la carta `rival`. */
export function opcionesContra(
  propioActivo: CartaEnJuego,
  rivalActivo: CartaEnJuego,
  configuracion: Configuracion,
  abilities: Habilidad[],
  config: EngineConfig,
  ocultarDano: boolean,
): OpcionAtaque[] {
  const atacanteStats = configuracion.reptiles[propioActivo.reptilId];
  const defensorStats = configuracion.reptiles[rivalActivo.reptilId];
  if (!atacanteStats || !defensorStats) return [];
  const propio = { activo: propioActivo };
  const rival = { activo: rivalActivo };

  const atacante: Reptil = reptilDesdeStats(atacanteStats, { atk: Math.round(atacanteStats.atk * multiplicadorEstado(propio.activo, "atk")) });
  const defensor: Reptil = reptilDesdeStats(defensorStats, {
    hp: rival.activo.hpActual,
    def: Math.round(defensorStats.def * multiplicadorEstado(rival.activo, "def")),
  });
  const tier = getAffinityTier(atacanteStats.afinidad, defensorStats.afinidad);

  const opciones = abilities.filter((a) => a.propietarioId === propioActivo.reptilId).map((h) => ({
    habilidad: h,
    tier,
    disponible: puedeUsarHabilidad(propio.activo!, h),
    cooldownRestante: propio.activo!.cooldowns[h.id] ?? 0,
    danoEstimado: ocultarDano ? 0 : calculateDamage(atacante, defensor, h, config).danoEsperado,
  }));

  if (ocultarDano) {
    return opciones.sort((a, b) => ORDEN_CATEGORIA[a.habilidad.categoria] - ORDEN_CATEGORIA[b.habilidad.categoria]);
  }
  return opciones.sort((a, b) => Number(b.disponible) - Number(a.disponible) || b.danoEstimado - a.danoEstimado);
}
