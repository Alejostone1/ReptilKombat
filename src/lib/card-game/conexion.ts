import type { Lado } from "./types";

/** Tiempo que se espera a un rival sin señal antes de darle la partida por abandonada. */
export const PLAZO_DESCONEXION_MS = 60_000;
/** Cada cuánto manda su latido un cliente conectado. */
export const INTERVALO_PING_MS = 15_000;
/** Minutos que una sala en espera sigue siendo válida (QR/código). */
export const MINUTOS_VIGENCIA_SALA = 30;

export interface SenalJugador {
  lado: Lado;
  /** ISO de su último latido/acción. */
  lastSeen: string;
}

export interface EvaluacionDesconexion {
  /** Lado que perdió por abandono, o null si nadie (o si no se puede decidir). */
  abandona: Lado | null;
  /** Segundos que lleva sin señal el rival de `yo`. */
  segundosSinSenalRival: number;
}

/**
 * Evalúa, desde el punto de vista de `yo` (quien acaba de dar señal), si su rival abandonó. Sin cron:
 * se llama de forma perezosa en cada ping. Si no hay rival, o la fecha es inválida, nadie abandona.
 */
export function evaluarDesconexion(jugadores: SenalJugador[], yo: Lado, ahora: number, plazoMs = PLAZO_DESCONEXION_MS): EvaluacionDesconexion {
  const rival = jugadores.find((j) => j.lado !== yo);
  const t = rival ? Date.parse(rival.lastSeen) : NaN;
  if (!rival || Number.isNaN(t)) return { abandona: null, segundosSinSenalRival: 0 };
  const sinSenalMs = Math.max(0, ahora - t);
  return {
    abandona: sinSenalMs > plazoMs ? rival.lado : null,
    segundosSinSenalRival: Math.floor(sinSenalMs / 1000),
  };
}

/** ¿La sala en espera ya caducó? `expiraEn` null = sin caducidad (salas anteriores a esta función). */
export function salaVencida(expiraEn: string | null, ahora: number): boolean {
  if (!expiraEn) return false;
  const t = Date.parse(expiraEn);
  return !Number.isNaN(t) && ahora > t;
}

/** Segundos que le quedan a un rival desconectado antes de perder (nunca negativo). */
export function segundosRestantesRival(segundosSinSenal: number, plazoMs = PLAZO_DESCONEXION_MS): number {
  return Math.max(0, Math.ceil(plazoMs / 1000 - segundosSinSenal));
}

export interface SenalJugadorEquipos {
  lado: Lado;
  asiento: number;
  lastSeen: string;
}

export interface EvaluacionDesconexionEquipos {
  /** Equipo que pierde por abandono (alguien de ese equipo lleva >plazo sin señal), o null. */
  equipoAbandona: Lado | null;
  /** Mayor silencio, en segundos, entre los OTROS tres jugadores (para el aviso en pantalla). */
  maxSegundosSinSenal: number;
}

/**
 * 2 vs 2: si alguien se queda sin señal más del plazo, su equipo pierde por abandono (su turno bloquearía la
 * partida). Si hay silenciosos en AMBOS equipos no se decide nada (no se sabe quién sigue conectado).
 */
export function evaluarDesconexionEquipos(
  jugadores: SenalJugadorEquipos[],
  yo: { lado: Lado; asiento: number },
  ahora: number,
  plazoMs = PLAZO_DESCONEXION_MS,
): EvaluacionDesconexionEquipos {
  const equiposSilenciosos = new Set<Lado>();
  let maxMs = 0;
  for (const j of jugadores) {
    if (j.lado === yo.lado && j.asiento === yo.asiento) continue;
    const t = Date.parse(j.lastSeen);
    if (Number.isNaN(t)) continue;
    const ms = Math.max(0, ahora - t);
    maxMs = Math.max(maxMs, ms);
    if (ms > plazoMs) equiposSilenciosos.add(j.lado);
  }
  return {
    equipoAbandona: equiposSilenciosos.size === 1 ? [...equiposSilenciosos][0] : null,
    maxSegundosSinSenal: Math.floor(maxMs / 1000),
  };
}
