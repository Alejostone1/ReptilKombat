/** Tope de la probabilidad de esquivar (%): ni el más veloz es intocable. */
export const ESQUIVA_MAXIMA = 25;
/** Puntos de esquiva (%) por cada punto de velocidad que el defensor le saca al atacante. */
export const ESQUIVA_POR_PUNTO = 0.4;

/**
 * Probabilidad (%) de que el defensor esquive un ataque, según cuánto más veloz es que el atacante.
 * Es la forma en que la velocidad pesa en el combate: un geco veloz esquiva a un animal pesado, pero entre
 * animales igual de rápidos (o si el atacante es más veloz) no hay esquiva.
 */
export function probabilidadEsquiva(velocidadDefensor: number, velocidadAtacante: number): number {
  const ventaja = velocidadDefensor - velocidadAtacante;
  if (!Number.isFinite(ventaja) || ventaja <= 0) return 0;
  return Math.min(ESQUIVA_MAXIMA, ventaja * ESQUIVA_POR_PUNTO);
}
