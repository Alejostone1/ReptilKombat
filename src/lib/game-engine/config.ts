/**
 * Único punto de verdad para los parámetros ajustables del motor de balance.
 * Ningún archivo de /lib/game-engine ni /components debe usar estos números como
 * literales: siempre deben recibir un EngineConfig (por defecto DEFAULT_ENGINE_CONFIG,
 * o el valor vigente desde lib/store/config-store).
 */
export interface EngineConfig {
  /** Multiplicador cuando el atacante tiene ventaja de tipo. */
  ventaja: number;
  /** Multiplicador cuando el enfrentamiento es neutral (incluye espejo). */
  neutral: number;
  /** Multiplicador cuando el atacante tiene desventaja de tipo. */
  desventaja: number;
  /** Multiplicador STAB: la habilidad coincide con la afinidad del usuario. */
  stab: number;
  /** BST estándar esperado para un personaje competitivo. */
  bstEstandar: number;
  /** Umbral de Win Rate (%) a partir del cual un personaje se considera dominante. */
  winRateDominante: number;
  /** Umbral de Win Rate (%) por debajo del cual un personaje se considera débil. */
  winRateDebil: number;
  /** Offset sumado a ATK/DEF en la fórmula de daño: (ATK + offset) / (DEF + offset). */
  offsetAtkDef: number;
  /** Divisor final de la fórmula de daño base. */
  divisorDano: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  ventaja: 1.25,
  neutral: 1.0,
  desventaja: 0.8,
  stab: 1.1,
  bstEstandar: 360,
  winRateDominante: 55,
  winRateDebil: 45,
  offsetAtkDef: 20,
  divisorDano: 10,
};

/** Pesos fijos de las fórmulas de índices derivados (no editables desde /configuracion). */
export const INDEX_WEIGHTS = {
  ofensivo: { atk: 1.1, spd: 0.65, inst: 0.4, adp: 0.25 },
  defensivo: { hp: 0.55, def: 1.15, adp: 0.35 },
  movilidad: { spd: 1.25, inst: 0.45 },
} as const;

/** Rangos de estadística individual usados por la auditoría automática. */
export const STAT_THRESHOLDS = {
  picoAlerta: 90,
  picoRiesgo: 95,
  sacrificioAlerta: 20,
  sacrificioRiesgo: 15,
};
