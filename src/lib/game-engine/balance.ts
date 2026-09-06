import type { Reptil, AuditoriaPersonaje, EstadoBalance } from "@/types/reptile";
import type { EngineConfig } from "./config";
import { STAT_THRESHOLDS } from "./config";
import { statMax, statMin } from "./stats";
import { calculateWinRate } from "./matchups";

export type MetaHealth = "BALANCEADO" | "REQUIERE_REVISION" | "DESEQUILIBRADO";

/**
 * Audita un personaje individual: valida BST, extremos estadísticos y Win Rate
 * frente a los umbrales vigentes del motor. Único punto de verdad para
 * clasificar personajes como APTO / REVISAR / RIESGO_ALTO.
 */
export function auditCharacter(
  reptil: Reptil,
  matrix: Record<string, Record<string, number>>,
  config: EngineConfig,
): AuditoriaPersonaje {
  const winRate = calculateWinRate(reptil.id, matrix);
  const max = statMax(reptil);
  const min = statMin(reptil);
  const alertas: string[] = [];

  if (reptil.bst !== config.bstEstandar) {
    alertas.push(`BST fuera de estándar (${reptil.bst} ≠ ${config.bstEstandar})`);
  }
  if (max > STAT_THRESHOLDS.picoAlerta) alertas.push(`ALERTA DE PICO: estadística máxima ${max}`);
  if (min < STAT_THRESHOLDS.sacrificioAlerta) alertas.push(`SACRIFICIO EXTREMO: estadística mínima ${min}`);
  if (winRate > config.winRateDominante) alertas.push(`DOMINANTE: Win Rate ${winRate}%`);
  if (winRate < config.winRateDebil) alertas.push(`DÉBIL: Win Rate ${winRate}%`);

  let estado: EstadoBalance = "APTO";
  const riesgoAlto =
    winRate > config.winRateDominante + 5 ||
    winRate < config.winRateDebil - 5 ||
    max > STAT_THRESHOLDS.picoRiesgo ||
    min < STAT_THRESHOLDS.sacrificioRiesgo ||
    Math.abs(reptil.bst - config.bstEstandar) > 10;

  if (riesgoAlto) estado = "RIESGO_ALTO";
  else if (alertas.length > 0) estado = "REVISAR";

  return {
    reptilId: reptil.id,
    bst: reptil.bst,
    bstEsperado: config.bstEstandar,
    statMax: max,
    statMin: min,
    rango: max - min,
    winRate,
    estado,
    alertas,
  };
}

export function auditRoster(
  roster: Reptil[],
  matrix: Record<string, Record<string, number>>,
  config: EngineConfig,
): AuditoriaPersonaje[] {
  return roster.map((r) => auditCharacter(r, matrix, config));
}

/** Estado general del meta: proporción de personajes dominantes/débiles vs. saludables. */
export function calculateMetaHealth(audits: AuditoriaPersonaje[]): MetaHealth {
  const total = audits.length || 1;
  const riesgo = audits.filter((a) => a.estado === "RIESGO_ALTO").length;
  const revisar = audits.filter((a) => a.estado === "REVISAR").length;

  const riesgoRatio = riesgo / total;
  const revisarRatio = (riesgo + revisar) / total;

  if (riesgoRatio > 0.1) return "DESEQUILIBRADO";
  if (revisarRatio > 0.2) return "REQUIERE_REVISION";
  return "BALANCEADO";
}

export function countByCompetitiveState(audits: AuditoriaPersonaje[]) {
  return {
    aptos: audits.filter((a) => a.estado === "APTO").length,
    revisar: audits.filter((a) => a.estado === "REVISAR").length,
    riesgoAlto: audits.filter((a) => a.estado === "RIESGO_ALTO").length,
  };
}

export function classifyWinRate(winRate: number, config: EngineConfig): "DOMINANTE" | "SALUDABLE" | "DEBIL" {
  if (winRate > config.winRateDominante) return "DOMINANTE";
  if (winRate < config.winRateDebil) return "DEBIL";
  return "SALUDABLE";
}
