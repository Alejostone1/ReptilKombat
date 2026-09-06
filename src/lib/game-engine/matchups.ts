import type { Reptil } from "@/types/reptile";
import type { EngineConfig } from "./config";
import { getAffinityMultiplier } from "./affinities";

export interface MatchupResult {
  atacanteId: string;
  defensorId: string;
  multiplicadorAtacante: number;
  multiplicadorDefensor: number;
  poderAtacante: number;
  poderDefensor: number;
  probabilidadAtacante: number;
  probabilidadDefensor: number;
}

/**
 * Poder de combate direccional = capacidad de daño del atacante (Índice Ofensivo
 * amplificado por el multiplicador de afinidad) relativizada a la resistencia del
 * defensor (Índice Defensivo). Dividir por la defensa rival es lo que evita que los
 * arquetipos "bruiser ofensivo" dominen estructuralmente sobre los tanques: un
 * personaje muy defensivo reduce el poder efectivo de cualquier rival contra él,
 * igual que en el simulador de daño. Es simétrico y determinista: un personaje
 * contra sí mismo siempre produce 50% / 50%.
 */
function combatPower(atacante: Reptil, defensor: Reptil, config: EngineConfig): number {
  const mult = getAffinityMultiplier(atacante.afinidad, defensor.afinidad, config);
  return (atacante.indiceOfensivo * mult) / defensor.indiceDefensivo;
}

export function calculateMatchup(a: Reptil, b: Reptil, config: EngineConfig): MatchupResult {
  const poderA = combatPower(a, b, config);
  const poderB = combatPower(b, a, config);
  const total = poderA + poderB;
  const probA = total > 0 ? (poderA / total) * 100 : 50;
  const probB = 100 - probA;

  return {
    atacanteId: a.id,
    defensorId: b.id,
    multiplicadorAtacante: getAffinityMultiplier(a.afinidad, b.afinidad, config),
    multiplicadorDefensor: getAffinityMultiplier(b.afinidad, a.afinidad, config),
    poderAtacante: round1(poderA),
    poderDefensor: round1(poderB),
    probabilidadAtacante: round1(probA),
    probabilidadDefensor: round1(probB),
  };
}

/** Matriz N×N de probabilidad de victoria (fila = atacante/protagonista, columna = rival). */
export function buildMatchupMatrix(roster: Reptil[], config: EngineConfig): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const a of roster) {
    matrix[a.id] = {};
    for (const b of roster) {
      matrix[a.id][b.id] = a.id === b.id ? 50 : calculateMatchup(a, b, config).probabilidadAtacante;
    }
  }
  return matrix;
}

/** Win Rate global = promedio de probabilidad de victoria contra todo el resto del roster. */
export function calculateWinRate(
  reptilId: string,
  matrix: Record<string, Record<string, number>>,
): number {
  const row = matrix[reptilId];
  const opponents = Object.keys(row).filter((id) => id !== reptilId);
  if (opponents.length === 0) return 50;
  const sum = opponents.reduce((acc, id) => acc + row[id], 0);
  return round1(sum / opponents.length);
}

export interface MatchupExtreme {
  reptilId: string;
  probabilidad: number;
}

export function getBestMatchup(reptilId: string, matrix: Record<string, Record<string, number>>): MatchupExtreme | null {
  const row = matrix[reptilId];
  const opponents = Object.keys(row).filter((id) => id !== reptilId);
  if (opponents.length === 0) return null;
  const best = opponents.reduce((a, b) => (row[a] >= row[b] ? a : b));
  return { reptilId: best, probabilidad: row[best] };
}

export function getWorstMatchup(reptilId: string, matrix: Record<string, Record<string, number>>): MatchupExtreme | null {
  const row = matrix[reptilId];
  const opponents = Object.keys(row).filter((id) => id !== reptilId);
  if (opponents.length === 0) return null;
  const worst = opponents.reduce((a, b) => (row[a] <= row[b] ? a : b));
  return { reptilId: worst, probabilidad: row[worst] };
}

/** Los mejores counters de un objetivo: rivales que más probabilidad tienen de vencerlo. */
export function getBestCounters(
  targetId: string,
  matrix: Record<string, Record<string, number>>,
  limit = 5,
): MatchupExtreme[] {
  return Object.keys(matrix)
    .filter((id) => id !== targetId)
    .map((id) => ({ reptilId: id, probabilidad: round1(100 - matrix[id][targetId]) }))
    .sort((a, b) => b.probabilidad - a.probabilidad)
    .slice(0, limit);
}

/** Los peores counters de un objetivo: rivales ante los que el objetivo domina con más margen. */
export function getWorstCounters(
  targetId: string,
  matrix: Record<string, Record<string, number>>,
  limit = 5,
): MatchupExtreme[] {
  return Object.keys(matrix)
    .filter((id) => id !== targetId)
    .map((id) => ({ reptilId: id, probabilidad: round1(matrix[targetId][id]) }))
    .sort((a, b) => b.probabilidad - a.probabilidad)
    .slice(0, limit);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type MatchupLabel =
  | "EQUILIBRADO"
  | "VENTAJA LIGERA"
  | "VENTAJA MODERADA"
  | "VENTAJA CLARA"
  | "VENTAJA ABRUMADORA";

/** Clasifica la magnitud de una probabilidad de victoria en una etiqueta legible. */
export function classifyMatchupMargin(probabilidadGanador: number): MatchupLabel {
  const margen = Math.abs(probabilidadGanador - 50);
  if (margen < 3) return "EQUILIBRADO";
  if (margen < 8) return "VENTAJA LIGERA";
  if (margen < 15) return "VENTAJA MODERADA";
  if (margen < 25) return "VENTAJA CLARA";
  return "VENTAJA ABRUMADORA";
}
