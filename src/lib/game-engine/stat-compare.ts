import type { Reptil } from "@/types/reptile";

/** Estadísticas que se comparan con barras al escoger carta (las que más pesan al decidir). */
export const STATS_COMPARABLES = ["hp", "atk", "def", "spd"] as const;
export type StatComparable = (typeof STATS_COMPARABLES)[number];

export type NivelStat = "bajo" | "medio" | "alto";

/** Convierte un valor a porcentaje 0–100 respecto al máximo del roster (para dibujar la barra). */
export function normalizarStat(valor: number, max: number): number {
  if (!Number.isFinite(valor) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((valor / max) * 100)));
}

/** Máximo de cada stat comparable en el roster: la barra al 100 % es "el mejor de todos". */
export function maximosDelRoster(roster: Pick<Reptil, StatComparable>[]): Record<StatComparable, number> {
  const maximos: Record<StatComparable, number> = { hp: 0, atk: 0, def: 0, spd: 0 };
  for (const r of roster) {
    for (const k of STATS_COMPARABLES) maximos[k] = Math.max(maximos[k], r[k]);
  }
  return maximos;
}

/** Etiqueta cualitativa para una barra: ayuda a leer de un vistazo sin comparar números. */
export function nivelStat(porcentaje: number): NivelStat {
  if (porcentaje >= 75) return "alto";
  if (porcentaje >= 45) return "medio";
  return "bajo";
}
