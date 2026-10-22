import type { Afinidad } from "@/types/affinity";
import type { CategoriaHabilidad } from "@/types/ability";
import type { CombatStats, Configuracion } from "./types";

/**
 * Etapas de una animación de combate, en orden. La lógica del ataque se ejecuta UNA sola vez al elegirlo;
 * estas etapas solo deciden cuándo se REVELA el resultado: el daño y la vida nueva aparecen en "impacto",
 * nunca antes, y nada de lo que se ve antes delata si el golpe será efectivo.
 */
export const ETAPAS = ["preparacion", "anticipacion", "ejecucion", "impacto", "reaccion", "recuperacion"] as const;
export type Etapa = (typeof ETAPAS)[number];

/** ¿La etapa actual ya muestra el resultado real (vida nueva, número de daño)? */
export function resultadoRevelado(etapa: Etapa | null): boolean {
  return etapa === null || ETAPAS.indexOf(etapa) >= ETAPAS.indexOf("impacto");
}

export type TipoParticula = "brasas" | "burbujas" | "gotas" | "esquirlas" | "estelas" | "hojas" | "destellos" | "anillos";
/**
 * Cómo se desplaza el ataque:
 * - embestida: el animal se lanza contra el rival (golpes físicos).
 * - proyectil: se queda y lanza una esfera de energía (especiales).
 * - aura: no se mueve; la energía rodea al objetivo (control) o a sí mismo (apoyo).
 */
export type Trayecto = "embestida" | "proyectil" | "aura";

export interface EstiloAtaque {
  color: string;
  particulas: TipoParticula;
  trayecto: Trayecto;
  /** Animal de gran masa: se mueve más lento y su impacto es más contundente. */
  pesado: boolean;
  /** Animal veloz: movimientos más cortos y secos. */
  veloz: boolean;
  /** Duración de cada etapa en ms. */
  duraciones: Record<Etapa, number>;
  /** Intensidad del temblor de cámara (px) en el impacto. */
  temblor: number;
  /** Cantidad de partículas del impacto. */
  nParticulas: number;
  /** Distancia (px) de la embestida o del desplazamiento de la esfera. */
  alcance: number;
  critico: boolean;
}

const COLOR_AFINIDAD: Record<Afinidad, string> = {
  Térmico: "#ff8a3d",
  Acuático: "#4cb4ff",
  Venenoso: "#b36bff",
  Acorazado: "#b8c4cc",
  Ágil: "#43e089",
  Camuflaje: "#b5cf3a",
  Sensorial: "#2fd9bd",
  Constrictor: "#c98f6a",
};

const PARTICULAS: Record<Afinidad, TipoParticula> = {
  Térmico: "brasas",
  Acuático: "burbujas",
  Venenoso: "gotas",
  Acorazado: "esquirlas",
  Ágil: "estelas",
  Camuflaje: "hojas",
  Sensorial: "destellos",
  Constrictor: "anillos",
};

/** Etapas base en ms (~2,1 s en total): suficiente para apreciar cada fase sin hacer lento el combate. */
const BASE: Record<Etapa, number> = { preparacion: 400, anticipacion: 280, ejecucion: 240, impacto: 360, reaccion: 460, recuperacion: 380 };

/** Un animal es "pesado" por su masa (vida + defensa) frente a su movilidad. */
export function esPesado(stats: Pick<CombatStats, "hp" | "def"> & { spd?: number }): boolean {
  return stats.hp + stats.def - (stats.spd ?? 40) >= 128;
}

export function esVeloz(spd: number): boolean {
  return spd >= 70;
}

function trayectoDe(categoria: CategoriaHabilidad, afinidad: Afinidad): Trayecto {
  if (categoria === "Fisica") return "embestida";
  if (categoria === "Tecnica") return afinidad === "Acorazado" || afinidad === "Constrictor" ? "embestida" : "proyectil";
  return "aura";
}

/**
 * Estilo de animación de un ataque: sale del TIPO del animal (color y partículas), de la CATEGORÍA del
 * ataque (cómo se desplaza) y de su masa y rapidez (cuánto pesa el golpe). Es puro y determinista.
 */
export function estiloDeAtaque(afinidad: Afinidad, categoria: CategoriaHabilidad, opciones: { pesado?: boolean; veloz?: boolean; critico?: boolean } = {}): EstiloAtaque {
  const pesado = !!opciones.pesado;
  const veloz = !!opciones.veloz && !pesado;
  const critico = !!opciones.critico;
  const factor = pesado ? 1.18 : veloz ? 0.82 : 1;
  const duraciones = Object.fromEntries(ETAPAS.map((e) => [e, Math.round(BASE[e] * factor)])) as Record<Etapa, number>;
  // El golpe crítico se "saborea": el impacto dura un poco más.
  if (critico) duraciones.impacto = Math.round(duraciones.impacto * 1.35);
  const trayecto = trayectoDe(categoria, afinidad);
  return {
    color: COLOR_AFINIDAD[afinidad],
    particulas: PARTICULAS[afinidad],
    trayecto,
    pesado,
    veloz,
    duraciones,
    temblor: (pesado ? 9 : veloz ? 4 : 6) * (critico ? 1.5 : 1) * (trayecto === "aura" ? 0.4 : 1),
    nParticulas: (pesado ? 16 : 12) + (critico ? 6 : 0) + (trayecto === "proyectil" ? 2 : 0),
    alcance: pesado ? 30 : veloz ? 46 : 38,
    critico,
  };
}

/** Estilo para el ataque `habilidadId` del animal activo `atacanteId`, según el snapshot de la partida. */
export function estiloParaAtaque(configuracion: Configuracion, atacanteId: string, categoria: CategoriaHabilidad, critico: boolean): EstiloAtaque {
  const stats = configuracion.reptiles[atacanteId];
  const afinidad: Afinidad = stats?.afinidad ?? "Térmico";
  return estiloDeAtaque(afinidad, categoria, { pesado: stats ? esPesado(stats) : false, veloz: esVeloz(stats?.spd ?? 40), critico });
}

let contadorAtaques = 0;
/** Identificador único de cada ataque animado (nunca se repite durante la sesión del navegador). */
export function nuevoIdAtaque(): number {
  return ++contadorAtaques;
}

export function duracionTotal(estilo: EstiloAtaque): number {
  return ETAPAS.reduce((suma, e) => suma + estilo.duraciones[e], 0);
}
