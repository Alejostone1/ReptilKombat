import type {
  Afinidad,
  AffinityAudit,
  AffinityMatrixCell,
  MatchupTier,
} from "@/types/affinity";
import { AFFINITIES } from "@/types/affinity";
import { AFFINITY_TIERS } from "@/data/affinities";
import type { EngineConfig } from "./config";

/** Devuelve el tier (ventaja/neutral/desventaja) de un enfrentamiento de tipos. */
export function getAffinityTier(atacante: Afinidad, defensor: Afinidad): MatchupTier {
  return AFFINITY_TIERS[atacante][defensor];
}

/**
 * Traduce un tier a un multiplicador numérico usando la configuración vigente
 * del motor. Este es el ÚNICO lugar del proyecto que debe convertir tier -> número.
 */
export function getAffinityMultiplier(
  atacante: Afinidad,
  defensor: Afinidad,
  config: EngineConfig,
): number {
  const tier = getAffinityTier(atacante, defensor);
  if (tier === "ventaja") return config.ventaja;
  if (tier === "desventaja") return config.desventaja;
  return config.neutral;
}

const TIER_EXPLANATION: Record<MatchupTier, (a: Afinidad, d: Afinidad) => string> = {
  ventaja: (a, d) => `${a} explota una debilidad estructural de ${d}: daño amplificado.`,
  desventaja: (a, d) => `${a} se enfrenta en desventaja ante ${d}: daño reducido.`,
  neutral: (a, d) =>
    a === d
      ? `Enfrentamiento en espejo: ninguna afinidad domina sobre sí misma.`
      : `${a} y ${d} no tienen relación de contraataque directa: intercambio neutral.`,
};

export function explainMatchup(atacante: Afinidad, defensor: Afinidad): string {
  const tier = getAffinityTier(atacante, defensor);
  return TIER_EXPLANATION[tier](atacante, defensor);
}

export function buildMatrixCells(config: EngineConfig): AffinityMatrixCell[] {
  const cells: AffinityMatrixCell[] = [];
  for (const atacante of AFFINITIES) {
    for (const defensor of AFFINITIES) {
      cells.push({
        atacante,
        defensor,
        multiplicador: getAffinityMultiplier(atacante, defensor, config),
        tier: getAffinityTier(atacante, defensor),
      });
    }
  }
  return cells;
}

/**
 * Audita la matriz de afinidades: cada tipo debe tener exactamente 2 ventajas,
 * 2 debilidades y 4 neutrales (incluyendo el espejo), con índice de dominancia 0.
 */
export function auditAffinityMatrix(): AffinityAudit[] {
  return AFFINITIES.map((afinidad) => {
    const ventajas: Afinidad[] = [];
    const debilidades: Afinidad[] = [];
    const neutrales: Afinidad[] = [];
    for (const otra of AFFINITIES) {
      const tier = getAffinityTier(afinidad, otra);
      if (tier === "ventaja") ventajas.push(otra);
      else if (tier === "desventaja") debilidades.push(otra);
      else neutrales.push(otra);
    }
    const indiceDominancia = ventajas.length - debilidades.length;
    const estado: AffinityAudit["estado"] =
      ventajas.length === 2 && debilidades.length === 2 && neutrales.length === 4 && indiceDominancia === 0
        ? "OK"
        : "ALERTA";
    return { afinidad, ventajas, debilidades, neutrales, indiceDominancia, estado };
  });
}
