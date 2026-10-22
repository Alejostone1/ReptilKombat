import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { MatchupTier } from "@/types/affinity";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage, aplicarVarianza } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { CartaEnJuego, Configuracion, EventoLog, FaseJuego, JugadorState, Lado, TipoEstado } from "./types";
import {
  bancaDe,
  construirConfiguracion,
  multiplicadorEstado,
  nuevaCartaEnJuego,
  puedeUsarHabilidad,
  reptilDesdeStats,
  retirarABanca,
  round2,
  tickearEstados,
} from "./engine";

/**
 * Modo 2 vs 2 (motor aparte y aditivo: no toca engine.ts). Cuatro jugadores, cada uno con su mazo, una carta
 * activa y banca. Asientos por índice: 0=A1, 1=B1, 2=A2, 3=B2, y el turno rota 0→1→2→3 (alternando equipos),
 * saltando a quien ya no tiene cartas. Reutiliza calculateDamage, estados, energía y cooldowns del 1 vs 1.
 */

/** Cartas por jugador en 2 vs 2 (8 en total en la mesa). */
export const MAX_CARTAS_MAZO_2V2 = 2;
export const NUM_JUGADORES_2V2 = 4;

export type IndiceJugador = number; // 0..3

export function equipoDe(idx: IndiceJugador): Lado {
  return idx % 2 === 0 ? "A" : "B";
}
export function companeroDe(idx: IndiceJugador): IndiceJugador {
  return (idx + 2) % 4;
}
export function rivalesDe(idx: IndiceJugador): IndiceJugador[] {
  return equipoDe(idx) === "A" ? [1, 3] : [0, 2];
}
/** Asiento (índice) para un equipo y un puesto 1|2: A1=0, B1=1, A2=2, B2=3. */
export function indiceDeAsiento(equipo: Lado, asiento: 1 | 2): IndiceJugador {
  return (asiento - 1) * 2 + (equipo === "A" ? 0 : 1);
}
export function asientoDeIndice(idx: IndiceJugador): { equipo: Lado; asiento: 1 | 2 } {
  return { equipo: equipoDe(idx), asiento: idx < 2 ? 1 : 2 };
}

export interface EstadoEquipos {
  formato: "2v2";
  jugadores: JugadorState[]; // siempre 4, ver índices arriba
  turnoIdx: IndiceJugador;
  numeroTurno: number;
  fase: FaseJuego;
  ganador: Lado | null;
  log: EventoLog[];
  configuracion: Configuracion;
}

export function esEstadoEquipos(estado: unknown): estado is EstadoEquipos {
  return typeof estado === "object" && estado !== null && (estado as { formato?: unknown }).formato === "2v2";
}

function tieneCartas(j: JugadorState): boolean {
  return j.activo !== null || j.mazo.length > 0 || bancaDe(j).length > 0;
}

function equipoVivo(state: EstadoEquipos, equipo: Lado): boolean {
  return state.jugadores.some((j, i) => equipoDe(i) === equipo && tieneCartas(j));
}

export function verificarGanadorEquipos(state: EstadoEquipos): Lado | null {
  const a = equipoVivo(state, "A");
  const b = equipoVivo(state, "B");
  if (a && !b) return "A";
  if (b && !a) return "B";
  return null;
}

export function crearPartidaEquipos(
  mazos: string[][],
  nombres: string[],
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
): EstadoEquipos {
  if (mazos.length !== NUM_JUGADORES_2V2 || nombres.length !== NUM_JUGADORES_2V2) throw new Error("2 vs 2 necesita exactamente 4 jugadores.");
  mazos.forEach((m, i) => {
    if (m.length === 0 || m.length > MAX_CARTAS_MAZO_2V2) {
      throw new Error(`El mazo de ${nombres[i]} debe tener entre 1 y ${MAX_CARTAS_MAZO_2V2} reptiles.`);
    }
  });
  return {
    formato: "2v2",
    jugadores: mazos.map((m, i) => ({ nombre: nombres[i], mazo: [...m], activo: null, cementerio: [], banca: [] })),
    turnoIdx: 0,
    numeroTurno: 1,
    fase: "invocando",
    ganador: null,
    log: [],
    configuracion: construirConfiguracion(mazos.flat(), [], roster, abilities, config),
  };
}

function conJugadorIdx(state: EstadoEquipos, idx: IndiceJugador, j: JugadorState): EstadoEquipos {
  return { ...state, jugadores: state.jugadores.map((x, i) => (i === idx ? j : x)) };
}

export function puedeInvocarEquipos(state: EstadoEquipos): boolean {
  if (state.fase === "terminado") return false;
  const j = state.jugadores[state.turnoIdx];
  return j.activo === null && (j.mazo.length > 0 || bancaDe(j).length > 0);
}

export function puedeAtacarEquipos(state: EstadoEquipos): boolean {
  return state.fase === "combatiendo" && state.jugadores[state.turnoIdx].activo !== null;
}

export function puedeCambiarEquipos(state: EstadoEquipos): boolean {
  if (state.fase !== "combatiendo") return false;
  const j = state.jugadores[state.turnoIdx];
  return j.activo !== null && (j.mazo.length > 0 || bancaDe(j).length > 0);
}

/** Rivales del jugador en turno que tienen carta activa (posibles objetivos). */
export function objetivosValidos(state: EstadoEquipos, idx: IndiceJugador = state.turnoIdx): IndiceJugador[] {
  return rivalesDe(idx).filter((r) => state.jugadores[r].activo !== null);
}

export function invocarEquipos(state: EstadoEquipos, reptilId: string, roster: Reptil[]): EstadoEquipos {
  if (!puedeInvocarEquipos(state)) throw new Error("No se puede invocar en este momento.");
  const idx = state.turnoIdx;
  const j = state.jugadores[idx];
  const enBanca = bancaDe(j).find((c) => c.reptilId === reptilId);
  if (!enBanca && !j.mazo.includes(reptilId)) throw new Error("Ese reptil no está disponible en el mazo.");
  const stats = state.configuracion.reptiles[reptilId];
  const reptil = roster.find((r) => r.id === reptilId);
  if (!stats || !reptil) throw new Error("Reptil desconocido.");

  const nuevo: JugadorState = {
    ...j,
    mazo: j.mazo.filter((id) => id !== reptilId),
    banca: bancaDe(j).filter((c) => c.reptilId !== reptilId),
    activo: enBanca ?? nuevaCartaEnJuego(reptilId, stats.hp, stats.energiaMax),
  };
  let next = conJugadorIdx(state, idx, nuevo);
  next = {
    ...next,
    log: [...next.log, { turno: state.numeroTurno, lado: equipoDe(idx), tipo: "invocacion", mensaje: `${j.nombre} invoca a ${reptil.nombre}.` }],
  };
  if (next.fase === "invocando" && next.jugadores.every((p) => p.activo !== null)) next = { ...next, fase: "combatiendo" };
  return avanzarTurnoEquipos(next);
}

export function cambiarEquipos(state: EstadoEquipos, reptilId: string, roster: Reptil[]): EstadoEquipos {
  if (!puedeCambiarEquipos(state)) throw new Error("No se puede cambiar de carta en este momento.");
  const idx = state.turnoIdx;
  const j = state.jugadores[idx];
  const saliente = j.activo!;
  if (saliente.reptilId === reptilId) throw new Error("Esa carta ya está en combate.");
  const enBanca = bancaDe(j).find((c) => c.reptilId === reptilId);
  if (!enBanca && !j.mazo.includes(reptilId)) throw new Error("Esa carta no está disponible para entrar.");
  const stats = state.configuracion.reptiles[reptilId];
  const reptil = roster.find((r) => r.id === reptilId);
  if (!stats || !reptil) throw new Error("Reptil desconocido.");
  const nombreSaliente = state.configuracion.reptiles[saliente.reptilId]?.nombre ?? "su reptil";

  const nuevo: JugadorState = {
    ...j,
    mazo: j.mazo.filter((id) => id !== reptilId),
    banca: [...bancaDe(j).filter((c) => c.reptilId !== reptilId), retirarABanca(saliente)],
    activo: enBanca ?? nuevaCartaEnJuego(reptilId, stats.hp, stats.energiaMax),
  };
  const next = {
    ...conJugadorIdx(state, idx, nuevo),
    log: [
      ...state.log,
      { turno: state.numeroTurno, lado: equipoDe(idx), tipo: "cambio" as const, mensaje: `${j.nombre} retira a ${nombreSaliente} y entra ${reptil.nombre}.` },
    ],
  };
  return avanzarTurnoEquipos(next);
}

export interface ResultadoAtaqueEquipos {
  state: EstadoEquipos;
  habilidadId: string;
  atacanteIdx: IndiceJugador;
  objetivoIdx: IndiceJugador;
  danoEsperado: number;
  multiplicadorAfinidad: number;
  stab: number;
  superEfectivo: boolean;
  tier: MatchupTier;
  critico: boolean;
  derrotado: boolean;
  efectoAplicado: { tipo: TipoEstado | "curacion"; magnitud: number } | null;
}

const TIPOS_BUFF = new Set<TipoEstado>(["buff_atk", "buff_def", "buff_spd"]);

export function atacarEquipos(
  state: EstadoEquipos,
  habilidadId: string,
  objetivoIdx: IndiceJugador,
  config: EngineConfig,
  opciones: { rng?: () => number } = {},
): ResultadoAtaqueEquipos {
  const rng = opciones.rng ?? Math.random;
  if (!puedeAtacarEquipos(state)) throw new Error("No se puede atacar en este momento.");
  const atacanteIdx = state.turnoIdx;
  if (!rivalesDe(atacanteIdx).includes(objetivoIdx)) throw new Error("Solo puedes atacar a un rival.");
  const atacanteJ = state.jugadores[atacanteIdx];
  const defensorJ = state.jugadores[objetivoIdx];
  if (!atacanteJ.activo) throw new Error("No hay un reptil activo para atacar.");
  if (!defensorJ.activo) throw new Error("Ese rival no tiene un reptil activo.");

  const atacanteStats = state.configuracion.reptiles[atacanteJ.activo.reptilId];
  const defensorStats = state.configuracion.reptiles[defensorJ.activo.reptilId];
  const habilidad = state.configuracion.habilidades[habilidadId];
  if (!atacanteStats || !defensorStats || !habilidad) throw new Error("Datos de combate incompletos.");
  if (habilidad.propietarioId !== atacanteStats.id) throw new Error("Esa habilidad no pertenece al reptil activo.");
  if (!puedeUsarHabilidad(atacanteJ.activo, habilidad)) throw new Error("Esa habilidad no está disponible (cooldown o energía insuficiente).");

  const atacante = reptilDesdeStats(atacanteStats, { atk: Math.round(atacanteStats.atk * multiplicadorEstado(atacanteJ.activo, "atk")) });
  const defensor = reptilDesdeStats(defensorStats, {
    hp: defensorJ.activo.hpActual,
    def: Math.round(defensorStats.def * multiplicadorEstado(defensorJ.activo, "def")),
  });
  const resultado = calculateDamage(atacante, defensor, habilidad, config);
  const tier = getAffinityTier(atacanteStats.afinidad, defensorStats.afinidad);
  // Mismo orden de tiradas que en 1 vs 1: 1) crítico, 2) variación ±15 %.
  const critico = rng() * 100 < atacanteStats.criticoProbabilidad;
  const danoVariado = aplicarVarianza(resultado.danoEsperado, rng);
  const danoFinal = critico ? round2(danoVariado * config.criticoMultiplicador) : danoVariado;

  const nuevoHp = Math.max(0, defensorJ.activo.hpActual - danoFinal);
  const derrotado = nuevoHp <= 0;

  let nuevoDefensor: JugadorState = derrotado
    ? { ...defensorJ, activo: null, cementerio: [...defensorJ.cementerio, defensorJ.activo.reptilId] }
    : { ...defensorJ, activo: { ...defensorJ.activo, hpActual: nuevoHp } };

  let nuevoAtacante: JugadorState = {
    ...atacanteJ,
    activo: {
      ...atacanteJ.activo,
      energiaActual: atacanteJ.activo.energiaActual - habilidad.costoEnergia,
      cooldowns:
        habilidad.cooldownTurnos > 0 ? { ...atacanteJ.activo.cooldowns, [habilidadId]: habilidad.cooldownTurnos } : atacanteJ.activo.cooldowns,
    },
  };

  let efectoAplicado: ResultadoAtaqueEquipos["efectoAplicado"] = null;
  if (habilidad.tipoEfecto && habilidad.efectoMagnitud !== null) {
    if (habilidad.tipoEfecto === "curacion") {
      const hpMax = atacanteStats.hp;
      const curado = Math.min(hpMax, nuevoAtacante.activo!.hpActual + Math.round((hpMax * habilidad.efectoMagnitud) / 100));
      nuevoAtacante = { ...nuevoAtacante, activo: { ...nuevoAtacante.activo!, hpActual: curado } };
      efectoAplicado = { tipo: "curacion", magnitud: habilidad.efectoMagnitud };
    } else if (TIPOS_BUFF.has(habilidad.tipoEfecto)) {
      const estado = { tipo: habilidad.tipoEfecto, turnosRestantes: habilidad.efectoTurnos ?? 2, magnitud: habilidad.efectoMagnitud };
      nuevoAtacante = { ...nuevoAtacante, activo: { ...nuevoAtacante.activo!, estados: [...nuevoAtacante.activo!.estados, estado] } };
      efectoAplicado = { tipo: habilidad.tipoEfecto, magnitud: habilidad.efectoMagnitud };
    } else if (!derrotado) {
      const estado = { tipo: habilidad.tipoEfecto, turnosRestantes: habilidad.efectoTurnos ?? 2, magnitud: habilidad.efectoMagnitud };
      nuevoDefensor = { ...nuevoDefensor, activo: { ...nuevoDefensor.activo!, estados: [...nuevoDefensor.activo!.estados, estado] } };
      efectoAplicado = { tipo: habilidad.tipoEfecto, magnitud: habilidad.efectoMagnitud };
    }
  }

  const lado = equipoDe(atacanteIdx);
  const log: EventoLog[] = [
    {
      turno: state.numeroTurno,
      lado,
      tipo: "ataque",
      mensaje: `${atacanteJ.nombre} usa ${habilidad.nombre} contra ${defensorStats.nombre} de ${defensorJ.nombre} (${Math.round(danoFinal)} de daño${critico ? ", ¡CRÍTICO!" : ""}).`,
      detalle: {
        habilidadId,
        danoEsperado: danoFinal,
        multiplicadorAfinidad: resultado.multiplicadorAfinidad,
        stab: resultado.stab,
        superEfectivo: tier === "ventaja",
        critico,
        efectoTipo: efectoAplicado?.tipo,
        efectoMagnitud: efectoAplicado?.magnitud,
      },
    },
  ];
  if (derrotado) log.push({ turno: state.numeroTurno, lado: equipoDe(objetivoIdx), tipo: "derrota", mensaje: `${defensorStats.nombre} queda fuera de combate.` });

  let next = conJugadorIdx(conJugadorIdx(state, atacanteIdx, nuevoAtacante), objetivoIdx, nuevoDefensor);
  next = { ...next, log: [...next.log, ...log] };
  next = avanzarTurnoEquipos(next);

  return {
    state: next,
    habilidadId,
    atacanteIdx,
    objetivoIdx,
    danoEsperado: danoFinal,
    multiplicadorAfinidad: resultado.multiplicadorAfinidad,
    stab: resultado.stab,
    superEfectivo: tier === "ventaja",
    tier,
    critico,
    derrotado,
    efectoAplicado,
  };
}

/**
 * Pasa el turno al siguiente jugador que todavía tenga cartas (orden 0→1→2→3). Al empezar su turno, si
 * tiene carta activa: regenera energía, tickea estados (el veneno puede derrotarla) y, si sigue aturdida,
 * pierde el turno. Termina la partida si un equipo se queda sin cartas.
 */
function avanzarTurnoEquipos(inicial: EstadoEquipos): EstadoEquipos {
  let state = inicial;
  for (let guardia = 0; guardia < 24; guardia++) {
    const ganador = verificarGanadorEquipos(state);
    if (ganador) {
      return {
        ...state,
        ganador,
        fase: "terminado",
        log: [...state.log, { turno: state.numeroTurno, lado: ganador, tipo: "victoria", mensaje: `¡El equipo ${ganador} gana la partida!` }],
      };
    }

    // Siguiente jugador con cartas.
    let idx = state.turnoIdx;
    do {
      idx = (idx + 1) % NUM_JUGADORES_2V2;
    } while (!tieneCartas(state.jugadores[idx]));
    state = { ...state, turnoIdx: idx, numeroTurno: state.numeroTurno + 1 };

    const j = state.jugadores[idx];
    const activo = j.activo;
    if (!activo) return state; // debe invocar (inicio de partida o reemplazo tras caer su carta)

    const stats = state.configuracion.reptiles[activo.reptilId];
    const hpMax = stats?.hp ?? activo.hpActual;
    const energiaMax = stats?.energiaMax ?? activo.energiaActual;
    const { carta: tickeada, danoVeneno } = tickearEstados(activo, hpMax);
    const carta: CartaEnJuego = {
      ...tickeada,
      energiaActual: Math.min(energiaMax, tickeada.energiaActual + state.configuracion.energiaRegenTurno),
    };

    if (carta.hpActual <= 0) {
      state = conJugadorIdx(state, idx, { ...j, activo: null, cementerio: [...j.cementerio, activo.reptilId] });
      state = {
        ...state,
        log: [...state.log, { turno: state.numeroTurno, lado: equipoDe(idx), tipo: "derrota", mensaje: `${j.nombre} pierde a su reptil por veneno.` }],
      };
      // Si le quedan cartas, el turno sigue siendo suyo para invocar; si no, el bucle lo salta.
      if (tieneCartas(state.jugadores[idx])) return state;
      state = { ...state, turnoIdx: idx };
      continue;
    }

    if (danoVeneno > 0) {
      state = {
        ...state,
        log: [
          ...state.log,
          { turno: state.numeroTurno, lado: equipoDe(idx), tipo: "estado", mensaje: `${j.nombre} pierde ${danoVeneno} HP por veneno.`, detalle: { efectoTipo: "veneno", efectoMagnitud: danoVeneno } },
        ],
      };
    }

    if (carta.aturdidoTurnos > 0) {
      state = conJugadorIdx(state, idx, { ...j, activo: { ...carta, aturdidoTurnos: carta.aturdidoTurnos - 1 } });
      state = {
        ...state,
        log: [...state.log, { turno: state.numeroTurno, lado: equipoDe(idx), tipo: "estado", mensaje: `${j.nombre} sigue aturdido y pierde el turno.` }],
      };
      continue;
    }

    return conJugadorIdx(state, idx, { ...j, activo: carta });
  }
  return state;
}

/**
 * Vista pública para el jugador `idxQueMira`: oculta los mazos (cartas aún no jugadas) de los demás —también
 * el de su compañero— y redacta el snapshot a los ids visibles, igual que en 1 vs 1. Activas, bancas y
 * cementerios de todos son públicos (ya se vieron en mesa).
 */
export function toPublicViewEquipos(state: EstadoEquipos, idxQueMira: IndiceJugador): EstadoEquipos {
  const jugadores = state.jugadores.map((j, i) => (i === idxQueMira ? j : { ...j, mazo: j.mazo.map(() => "?") }));
  const visibles = new Set<string>();
  state.jugadores.forEach((j, i) => {
    if (i === idxQueMira) j.mazo.forEach((id) => visibles.add(id));
    if (j.activo) visibles.add(j.activo.reptilId);
    j.cementerio.forEach((id) => visibles.add(id));
    bancaDe(j).forEach((c) => visibles.add(c.reptilId));
  });
  const reptiles: Configuracion["reptiles"] = {};
  const habilidades: Configuracion["habilidades"] = {};
  for (const id of visibles) if (state.configuracion.reptiles[id]) reptiles[id] = state.configuracion.reptiles[id];
  for (const h of Object.values(state.configuracion.habilidades)) if (visibles.has(h.propietarioId)) habilidades[h.id] = h;
  return { ...state, jugadores, configuracion: { reptiles, habilidades, energiaRegenTurno: state.configuracion.energiaRegenTurno } };
}
