/** Generador pseudoaleatorio con semilla (mulberry32): mismo número de semilla = misma secuencia. */
export function crearRng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG de prueba: devuelve los valores dados en orden y repite el último cuando se acaban. */
export function secuenciaRng(valores: number[]): () => number {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
}
