import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { GameState, JugadorState, Lado, EventoLog } from "./types";
import { MAX_CARTAS_MAZO } from "./types";

function otroLado(lado: Lado): Lado {
  return lado === "A" ? "B" : "A";
}

function jugador(state: GameState, lado: Lado): JugadorState {
  return lado === "A" ? state.jugadorA : state.jugadorB;
}

function conJugador(state: GameState, lado: Lado, jugadorNuevo: JugadorState): GameState {
  return lado === "A" ? { ...state, jugadorA: jugadorNuevo } : { ...state, jugadorB: jugadorNuevo };
}

/** Crea una partida nueva. Cada mazo es una lista de hasta 5 ids de reptiles activos. */
export function crearPartida(mazoA: string[], mazoB: string[], nombreA = "Jugador A", nombreB = "Jugador B"): GameState {
  if (mazoA.length === 0 || mazoA.length > MAX_CARTAS_MAZO) {
    throw new Error(`El mazo de ${nombreA} debe tener entre 1 y ${MAX_CARTAS_MAZO} reptiles.`);
  }
  if (mazoB.length === 0 || mazoB.length > MAX_CARTAS_MAZO) {
    throw new Error(`El mazo de ${nombreB} debe tener entre 1 y ${MAX_CARTAS_MAZO} reptiles.`);
  }

  return {
    jugadorA: { nombre: nombreA, mazo: [...mazoA], activo: null, cementerio: [] },
    jugadorB: { nombre: nombreB, mazo: [...mazoB], activo: null, cementerio: [] },
    turno: "A",
    numeroTurno: 1,
    fase: "invocando",
    ganador: null,
    log: [],
  };
}

export function puedeInvocar(state: GameState): boolean {
  if (state.fase === "terminado") return false;
  const j = jugador(state, state.turno);
  return j.activo === null && j.mazo.length > 0;
}

export function puedeAtacar(state: GameState): boolean {
  if (state.fase === "terminado") return false;
  const j = jugador(state, state.turno);
  return j.activo !== null;
}

/** Habilidades utilizables ahora mismo por el jugador en turno. */
export function habilidadesDisponibles(state: GameState, abilities: Habilidad[]): Habilidad[] {
  const j = jugador(state, state.turno);
  if (!j.activo) return [];
  return abilities.filter((a) => a.propietarioId === j.activo!.reptilId);
}

/** Invoca un reptil del mazo del jugador en turno. Pasa el turno automáticamente. */
export function invocar(state: GameState, reptilId: string, roster: Reptil[]): GameState {
  if (!puedeInvocar(state)) throw new Error("No se puede invocar en este momento.");
  const lado = state.turno;
  const j = jugador(state, lado);
  if (!j.mazo.includes(reptilId)) throw new Error("Ese reptil no está disponible en el mazo.");
  const reptil = roster.find((r) => r.id === reptilId);
  if (!reptil) throw new Error("Reptil desconocido.");

  const jugadorActualizado: JugadorState = {
    ...j,
    mazo: j.mazo.filter((id) => id !== reptilId),
    activo: { reptilId, hpActual: reptil.hp },
  };

  const evento: EventoLog = {
    turno: state.numeroTurno,
    lado,
    tipo: "invocacion",
    mensaje: `${j.nombre} invoca a ${reptil.nombre}.`,
  };

  let next = conJugador(state, lado, jugadorActualizado);
  next = { ...next, log: [...next.log, evento] };

  const ambosActivos = jugador(next, "A").activo !== null && jugador(next, "B").activo !== null;
  if (ambosActivos && next.fase === "invocando") next = { ...next, fase: "combatiendo" };

  return avanzarTurno(next);
}

export interface ResultadoAtaque {
  state: GameState;
  habilidadId: string;
  danoEsperado: number;
  multiplicadorAfinidad: number;
  stab: number;
  superEfectivo: boolean;
  derrotado: boolean;
}

/**
 * Resuelve un ataque del jugador en turno usando una de sus habilidades.
 * El daño se calcula con calculateDamage() — el MISMO motor que /simulador —
 * así el combate de cartas nunca diverge matemáticamente del resto del sistema.
 */
export function atacar(
  state: GameState,
  habilidadId: string,
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
): ResultadoAtaque {
  if (!puedeAtacar(state)) throw new Error("No se puede atacar en este momento.");
  const ladoAtacante = state.turno;
  const ladoDefensor = otroLado(ladoAtacante);
  const atacanteState = jugador(state, ladoAtacante);
  const defensorState = jugador(state, ladoDefensor);

  if (!atacanteState.activo) throw new Error("No hay un reptil activo para atacar.");
  if (!defensorState.activo) throw new Error("El rival no tiene un reptil activo para recibir el ataque.");

  const atacante = roster.find((r) => r.id === atacanteState.activo!.reptilId);
  const defensorBase = roster.find((r) => r.id === defensorState.activo!.reptilId);
  const habilidad = abilities.find((a) => a.id === habilidadId);
  if (!atacante || !defensorBase || !habilidad) throw new Error("Datos de combate incompletos.");
  if (habilidad.propietarioId !== atacante.id) throw new Error("Esa habilidad no pertenece al reptil activo.");

  // El defensor usa sus stats base pero con el HP actual de la partida (no el HP máximo).
  const defensorConHpActual: Reptil = { ...defensorBase, hp: defensorState.activo.hpActual };
  const resultado = calculateDamage(atacante, defensorConHpActual, habilidad, config);

  const superEfectivo = getAffinityTier(atacante.afinidad, defensorBase.afinidad) === "ventaja";
  const nuevoHp = Math.max(0, defensorState.activo.hpActual - resultado.danoEsperado);
  const derrotado = nuevoHp <= 0;

  const nuevoDefensorState: JugadorState = derrotado
    ? {
        ...defensorState,
        activo: null,
        cementerio: [...defensorState.cementerio, defensorState.activo.reptilId],
      }
    : { ...defensorState, activo: { ...defensorState.activo, hpActual: nuevoHp } };

  const eventoAtaque: EventoLog = {
    turno: state.numeroTurno,
    lado: ladoAtacante,
    tipo: "ataque",
    mensaje: `${atacanteState.nombre} usa ${habilidad.nombre} contra ${defensorBase.nombre} (${resultado.danoEsperado} de daño).`,
    detalle: {
      habilidadId,
      danoEsperado: resultado.danoEsperado,
      multiplicadorAfinidad: resultado.multiplicadorAfinidad,
      stab: resultado.stab,
      superEfectivo,
    },
  };

  let next = conJugador(state, ladoDefensor, nuevoDefensorState);
  next = { ...next, log: [...next.log, eventoAtaque] };

  if (derrotado) {
    next = {
      ...next,
      log: [
        ...next.log,
        {
          turno: state.numeroTurno,
          lado: ladoDefensor,
          tipo: "derrota",
          mensaje: `${defensorBase.nombre} queda fuera de combate.`,
        },
      ],
    };
  }

  next = avanzarTurno(next);

  return {
    state: next,
    habilidadId,
    danoEsperado: resultado.danoEsperado,
    multiplicadorAfinidad: resultado.multiplicadorAfinidad,
    stab: resultado.stab,
    superEfectivo,
    derrotado,
  };
}

function haPerdido(j: JugadorState): boolean {
  return j.activo === null && j.mazo.length === 0;
}

export function verificarGanador(state: GameState): Lado | null {
  const aPerdio = haPerdido(state.jugadorA);
  const bPerdio = haPerdido(state.jugadorB);
  if (aPerdio && !bPerdio) return "B";
  if (bPerdio && !aPerdio) return "A";
  return null;
}

function avanzarTurno(state: GameState): GameState {
  const ganador = verificarGanador(state);
  if (ganador) {
    return {
      ...state,
      ganador,
      fase: "terminado",
      log: [
        ...state.log,
        {
          turno: state.numeroTurno,
          lado: ganador,
          tipo: "victoria",
          mensaje: `${jugador(state, ganador).nombre} gana la partida.`,
        },
      ],
    };
  }
  return { ...state, turno: otroLado(state.turno), numeroTurno: state.numeroTurno + 1 };
}
