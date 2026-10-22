/**
 * Banderas de funcionalidad. Cada característica nueva vive detrás de una bandera para poder
 * apagarla sin tocar código si algo falla (p. ej. en Vercel: NEXT_PUBLIC_FEATURE_CARD_SWAP=false).
 *
 * Las banderas protegen solo lo NUEVO: el juego actual (1 vs 1 local, vs IA y online por código)
 * no depende de ninguna.
 *
 * Importante: Next solo inlinea `process.env.NEXT_PUBLIC_*` cuando se referencia de forma literal,
 * por eso cada variable se lee por su nombre completo (nada de claves dinámicas).
 */
export function parseFlag(valor: string | undefined, porDefecto: boolean): boolean {
  if (valor === undefined) return porDefecto;
  const v = valor.trim().toLowerCase();
  if (v === "") return porDefecto;
  if (v === "1" || v === "true" || v === "on" || v === "si" || v === "sí") return true;
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return porDefecto;
}

export const FEATURES = {
  /** Oculta el número de daño de cada ataque antes de usarlo (el resultado sí se ve tras atacar). */
  HIDE_ATTACK_DAMAGE: parseFlag(process.env.NEXT_PUBLIC_FEATURE_HIDE_ATTACK_DAMAGE, true),
  /** Permite "Cambiar carta" en lugar de atacar (consume el turno). */
  CARD_SWAP: parseFlag(process.env.NEXT_PUBLIC_FEATURE_CARD_SWAP, true),
  /** QR para compartir sala, escáner con cámara y reconexión de 60 s. */
  ONLINE_QR: parseFlag(process.env.NEXT_PUBLIC_FEATURE_ONLINE_QR, true),
  /** Modo 2 vs 2 (4 jugadores, 2 equipos). */
  MODE_2V2: parseFlag(process.env.NEXT_PUBLIC_FEATURE_MODE_2V2, true),
  /** Modos futuros (todos contra todos, solo una familia). Sin interfaz todavía. */
  FUTURE_MODES: parseFlag(process.env.NEXT_PUBLIC_FEATURE_FUTURE_MODES, false),
} as const;

export type NombreBandera = keyof typeof FEATURES;
