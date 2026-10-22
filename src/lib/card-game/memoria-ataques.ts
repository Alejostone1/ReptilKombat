export type NivelDano = "debil" | "medio" | "fuerte" | "efecto";

/** Un golpe que quita menos de este % de la vida máxima del objetivo es "débil". */
export const UMBRAL_DEBIL = 12;
/** A partir de este % es "fuerte"; entre los dos umbrales es "medio". */
export const UMBRAL_FUERTE = 22;

/** Clasifica un golpe ya recibido según el % de vida máxima que le quitó al objetivo. */
export function clasificarDano(dano: number, hpMaxObjetivo: number): NivelDano {
  if (dano <= 0 || hpMaxObjetivo <= 0) return "efecto";
  const pct = (dano / hpMaxObjetivo) * 100;
  if (pct < UMBRAL_DEBIL) return "debil";
  if (pct < UMBRAL_FUERTE) return "medio";
  return "fuerte";
}

/** Lo que el jugador recuerda de cada ataque suyo (por id de habilidad) tras probarlo. */
export type MemoriaAtaques = Record<string, NivelDano>;

export function recordarAtaque(memoria: MemoriaAtaques, habilidadId: string, nivel: NivelDano): MemoriaAtaques {
  return { ...memoria, [habilidadId]: nivel };
}

export const ETIQUETA_NIVEL: Record<NivelDano, string> = {
  debil: "débil",
  medio: "medio",
  fuerte: "fuerte",
  efecto: "efecto",
};

/**
 * Nivel de un golpe recién resuelto. Si fue crítico se le quita el multiplicador, para que
 * el jugador aprenda la fuerza REAL del ataque y no un golpe de suerte.
 */
export function nivelDeGolpe(dano: number, critico: boolean, criticoMultiplicador: number, hpMaxObjetivo: number): NivelDano {
  const base = critico && criticoMultiplicador > 0 ? dano / criticoMultiplicador : dano;
  return clasificarDano(base, hpMaxObjetivo);
}
