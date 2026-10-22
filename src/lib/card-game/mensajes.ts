import type { MatchupTier } from "@/types/affinity";
import type { Lado, TipoEstado } from "./types";

export type TonoMensaje = "critico" | "bueno" | "malo" | "neutro" | "ko";

export interface MensajeAtaque {
  /** Frase principal, corta y con energía (se muestra grande). */
  titulo: string;
  /** Línea secundaria opcional (efecto aplicado). */
  detalle?: string;
  tono: TonoMensaje;
}

export interface DatosMensaje {
  dano: number;
  tier: MatchupTier;
  critico: boolean;
  derrotado: boolean;
  /** El defensor esquivó (por velocidad). Opcional para no romper llamadas anteriores. */
  esquivado?: boolean;
  efecto: { tipo: TipoEstado | "curacion"; magnitud: number } | null;
}

const TEXTO_EFECTO: Record<TipoEstado | "curacion", string> = {
  veneno: "¡Lo envenenó!",
  debuff_atk: "¡Le bajó el ataque!",
  debuff_def: "¡Le bajó la defensa!",
  buff_atk: "¡Subió su ataque!",
  buff_def: "¡Subió su defensa!",
  buff_spd: "¡Subió su velocidad!",
  curacion: "¡Se curó!",
};

/**
 * Convierte el resultado de un ataque en texto corto para mostrar tras atacar. Es lo ÚNICO que el
 * jugador aprende del ataque (junto con el número flotante): nunca se usa antes de atacar.
 */
export function mensajeDeAtaque({ dano, tier, critico, derrotado, esquivado, efecto }: DatosMensaje): MensajeAtaque {
  const detalle = efecto ? TEXTO_EFECTO[efecto.tipo] : undefined;
  if (esquivado) return { titulo: "¡Lo esquivó!", detalle: "Su velocidad le salvó del golpe", tono: "malo" };
  if (derrotado) return { titulo: "¡K.O.!", detalle, tono: "ko" };
  if (dano <= 0) {
    return efecto ? { titulo: "¡Efecto aplicado!", detalle, tono: "bueno" } : { titulo: "No hizo nada…", tono: "neutro" };
  }
  if (critico) return { titulo: "¡Golpe crítico!", detalle, tono: "critico" };
  if (tier === "ventaja") return { titulo: "¡Súper efectivo!", detalle, tono: "bueno" };
  if (tier === "desventaja") return { titulo: "No es muy efectivo…", detalle, tono: "malo" };
  return { titulo: "¡Impacto!", detalle, tono: "neutro" };
}

export interface ImpactoFlotante {
  texto: string;
  tono: "dano" | "critico" | "curacion" | "info";
  /** Sobre quién flota: el rival (golpes, venenos, debilitamientos) o el propio atacante (curación y mejoras). */
  sobre: "rival" | "atacante";
}

const EMOJI_EFECTO: Record<TipoEstado | "curacion", string> = {
  veneno: "☠️",
  debuff_atk: "⚔️↓",
  debuff_def: "🛡️↓",
  buff_atk: "⚔️↑",
  buff_def: "🛡️↑",
  buff_spd: "⚡↑",
  curacion: "💚",
};

/** Lo que flota sobre la carta tras el ataque: el daño real (solo se revela DESPUÉS de atacar) o el efecto. */
export function impactoFlotante({ dano, critico, esquivado, efecto }: Pick<DatosMensaje, "dano" | "critico" | "efecto"> & { esquivado?: boolean }): ImpactoFlotante {
  if (esquivado) return { texto: "💨 ¡Esquivó!", tono: "info", sobre: "rival" };
  if (dano > 0) return { texto: `-${Math.round(dano)}`, tono: critico ? "critico" : "dano", sobre: "rival" };
  if (efecto) {
    const propio = efecto.tipo === "curacion" || efecto.tipo.startsWith("buff_");
    return { texto: EMOJI_EFECTO[efecto.tipo], tono: propio ? "curacion" : "info", sobre: propio ? "atacante" : "rival" };
  }
  return { texto: "…", tono: "info", sobre: "rival" };
}

export interface AtaqueTablero {
  id: number;
  atacante: Lado;
  objetivo: Lado;
  texto: string;
  tono: ImpactoFlotante["tono"];
  /** El objetivo esquivó: la animación es de esquiva, no de golpe. */
  esquivado: boolean;
}

/** Datos para que el tablero anime el ataque: quién embiste y sobre quién flota el número/efecto. */
export function ataqueParaTablero(
  datos: Pick<DatosMensaje, "dano" | "critico" | "efecto"> & { esquivado?: boolean },
  atacante: Lado,
  id: number,
): AtaqueTablero {
  const imp = impactoFlotante(datos);
  const rival: Lado = atacante === "A" ? "B" : "A";
  return { id, atacante, objetivo: imp.sobre === "rival" ? rival : atacante, texto: imp.texto, tono: imp.tono, esquivado: !!datos.esquivado };
}
