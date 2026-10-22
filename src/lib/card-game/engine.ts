import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage, aplicarVarianza } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import { probabilidadEsquiva } from "@/lib/game-engine/esquiva";
import type { MatchupTier } from "@/types/affinity";
import type { GameState, JugadorState, CartaEnJuego, Lado, EventoLog, Configuracion, TipoEstado, CombatStats } from "./types";
import { MAX_CARTAS_MAZO, USOS_MAXIMOS_HABILIDAD } from "./types";

function otroLado(lado: Lado): Lado {
  return lado === "A" ? "B" : "A";
}

function jugador(state: GameState, lado: Lado): JugadorState {
  return lado === "A" ? state.jugadorA : state.jugadorB;
}

/** Banca del jugador (vacía en estados antiguos que no la traen). */
export function bancaDe(j: JugadorState): CartaEnJuego[] {
  return j.banca ?? [];
}

function conJugador(state: GameState, lado: Lado, jugadorNuevo: JugadorState): GameState {
  return lado === "A" ? { ...state, jugadorA: jugadorNuevo } : { ...state, jugadorB: jugadorNuevo };
}

export function construirConfiguracion(mazoA: string[], mazoB: string[], roster: Reptil[], abilities: Habilidad[], config: EngineConfig): Configuracion {
  const ids = new Set([...mazoA, ...mazoB]);
  const reptiles: Configuracion["reptiles"] = {};
  const habilidades: Configuracion["habilidades"] = {};
  for (const id of ids) {
    const r = roster.find((x) => x.id === id);
    if (!r) throw new Error(`Reptil desconocido: ${id}`);
    reptiles[id] = {
      id: r.id,
      nombre: r.nombre,
      afinidad: r.afinidad,
      hp: r.hp,
      atk: r.atk,
      def: r.def,
      spd: r.spd,
      energiaMax: r.energiaMax,
      criticoProbabilidad: r.criticoProbabilidad,
    };
    for (const h of abilities.filter((a) => a.propietarioId === id)) habilidades[h.id] = h;
  }
  return { reptiles, habilidades, energiaRegenTurno: config.energiaRegenTurno };
}

/**
 * Crea una partida nueva. Cada mazo es una lista de hasta MAX_CARTAS_MAZO ids de reptiles activos.
 * `roster`/`abilities`/`config` solo se usan aquí, para congelar un snapshot en `GameState.configuracion`
 * — el resto de la partida nunca vuelve a leer datos en vivo, así que un cambio de admin a mitad de
 * partida jamás afecta una partida ya en curso.
 */
export function crearPartida(
  mazoA: string[],
  mazoB: string[],
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
  nombreA = "Jugador A",
  nombreB = "Jugador B",
): GameState {
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
    configuracion: construirConfiguracion(mazoA, mazoB, roster, abilities, config),
  };
}

export function puedeInvocar(state: GameState): boolean {
  if (state.fase === "terminado") return false;
  const j = jugador(state, state.turno);
  return j.activo === null && (j.mazo.length > 0 || bancaDe(j).length > 0);
}

/** Cambiar de carta: en tu turno, en combate, con carta activa y alguna otra disponible (mazo o banca). Gasta el turno. */
export function puedeCambiar(state: GameState): boolean {
  if (state.fase !== "combatiendo") return false;
  const j = jugador(state, state.turno);
  return j.activo !== null && (j.mazo.length > 0 || bancaDe(j).length > 0);
}

export function puedeAtacar(state: GameState): boolean {
  if (state.fase === "terminado") return false;
  const j = jugador(state, state.turno);
  return j.activo !== null;
}

/** Habilidades utilizables ahora mismo por el jugador en turno (solo por propietario — no filtra cooldown/energía, ver puedeUsarHabilidad). */
export function habilidadesDisponibles(state: GameState, abilities: Habilidad[]): Habilidad[] {
  const j = jugador(state, state.turno);
  if (!j.activo) return [];
  return abilities.filter((a) => a.propietarioId === j.activo!.reptilId);
}

/** Usos que le quedan a un ataque de esta carta (3 al empezar; nunca se restauran). */
export function usosRestantes(carta: CartaEnJuego, habilidad: Habilidad): number {
  return Math.max(0, USOS_MAXIMOS_HABILIDAD - (carta.usos?.[habilidad.id] ?? 0));
}

/** Si una carta puede usar una habilidad ahora mismo: con usos, sin cooldown y con energía suficiente. */
export function puedeUsarHabilidad(carta: CartaEnJuego, habilidad: Habilidad): boolean {
  const enCooldown = (carta.cooldowns[habilidad.id] ?? 0) > 0;
  const sinEnergia = carta.energiaActual < habilidad.costoEnergia;
  return !enCooldown && !sinEnergia && usosRestantes(carta, habilidad) > 0;
}

/** Id del ataque de último recurso: solo existe cuando a la carta no le queda ningún ataque utilizable. */
export const FORCEJEO_ID = "forcejeo";

/** Ataque básico de último recurso (sin costo, sin usos, potencia baja): evita que una carta sin usos deje la partida atascada. */
export function crearForcejeo(stats: Pick<CombatStats, "id" | "afinidad">): Habilidad {
  return {
    id: FORCEJEO_ID,
    nombre: "Forcejeo",
    propietarioId: stats.id,
    afinidad: stats.afinidad,
    potencia: 30,
    precision: 100,
    categoria: "Fisica",
    efecto: "Daño directo",
    costoEnergia: 0,
    cooldownTurnos: 0,
    tipoEfecto: null,
    efectoMagnitud: null,
    efectoTurnos: null,
  };
}

/** Nombre para mostrar de un ataque (incluye el Forcejeo, que no está en el snapshot). */
export function nombreDeHabilidad(configuracion: Configuracion, habilidadId: string): string | undefined {
  return habilidadId === FORCEJEO_ID ? "Forcejeo" : configuracion.habilidades[habilidadId]?.nombre;
}

/** Habilidades reales (snapshot congelado) de la carta, sin el forcejeo. */
export function habilidadesDeCarta(configuracion: Configuracion, carta: CartaEnJuego): Habilidad[] {
  return Object.values(configuracion.habilidades).filter((h) => h.propietarioId === carta.reptilId);
}

/** ¿La carta se quedó sin ningún ataque utilizable (por usos agotados, energía o recarga)? Entonces puede forcejear. */
export function sinAtaquesUtilizables(configuracion: Configuracion, carta: CartaEnJuego): boolean {
  return !habilidadesDeCarta(configuracion, carta).some((h) => puedeUsarHabilidad(carta, h));
}

/**
 * Resuelve el id de habilidad que pide el cliente: una del snapshot o el forcejeo (solo si no quedan
 * ataques utilizables). Es la única puerta de entrada, así ningún cliente puede saltarse el límite de usos.
 */
export function resolverHabilidad(configuracion: Configuracion, carta: CartaEnJuego, stats: CombatStats, habilidadId: string): Habilidad {
  if (habilidadId === FORCEJEO_ID) {
    if (!sinAtaquesUtilizables(configuracion, carta)) throw new Error("Aún tienes ataques disponibles.");
    return crearForcejeo(stats);
  }
  const habilidad = configuracion.habilidades[habilidadId];
  if (!habilidad) throw new Error("Datos de combate incompletos.");
  if (habilidad.propietarioId !== stats.id) throw new Error("Esa habilidad no pertenece al reptil activo.");
  if (!puedeUsarHabilidad(carta, habilidad)) {
    throw new Error(usosRestantes(carta, habilidad) <= 0 ? "Ese ataque ya no tiene usos." : "Esa habilidad no está disponible (cooldown o energía insuficiente).");
  }
  return habilidad;
}

/**
 * ¿El defensor esquiva este ataque? Depende de su velocidad frente a la del atacante (con buffs de velocidad).
 * Los ataques de Apoyo (a uno mismo) no se esquivan. Consume SIEMPRE una tirada del `rng` salvo en Apoyo,
 * para que la secuencia de tiradas de un ataque no dependa del resultado.
 */
export function resolverEsquiva(
  atacante: { stats: CombatStats; carta: CartaEnJuego },
  defensor: { stats: CombatStats; carta: CartaEnJuego },
  habilidad: Habilidad,
  rng: () => number,
): boolean {
  if (habilidad.categoria === "Estado") return false;
  const pct = probabilidadEsquiva(
    (defensor.stats.spd ?? 0) * multiplicadorEstado(defensor.carta, "spd"),
    (atacante.stats.spd ?? 0) * multiplicadorEstado(atacante.carta, "spd"),
  );
  const tirada = rng();
  return pct > 0 && tirada * 100 < pct;
}

/** Carta tras gastar la energía, poner el cooldown y contar el uso de una habilidad (el forcejeo no cuenta usos). */
export function cartaTrasUsar(carta: CartaEnJuego, habilidad: Habilidad): CartaEnJuego {
  const esForcejeo = habilidad.id === FORCEJEO_ID;
  return {
    ...carta,
    energiaActual: carta.energiaActual - habilidad.costoEnergia,
    cooldowns: habilidad.cooldownTurnos > 0 ? { ...carta.cooldowns, [habilidad.id]: habilidad.cooldownTurnos } : carta.cooldowns,
    usos: esForcejeo ? carta.usos : { ...(carta.usos ?? {}), [habilidad.id]: (carta.usos?.[habilidad.id] ?? 0) + 1 },
  };
}

export function nuevaCartaEnJuego(reptilId: string, hpActual: number, energiaMax: number): CartaEnJuego {
  return { reptilId, hpActual, energiaActual: energiaMax, cooldowns: {}, estados: [], aturdidoTurnos: 0 };
}

/** Invoca un reptil del mazo (carta nueva, vida completa) o de la banca (conserva su vida) del jugador en turno. Pasa el turno automáticamente. */
export function invocar(state: GameState, reptilId: string, roster: Reptil[]): GameState {
  if (!puedeInvocar(state)) throw new Error("No se puede invocar en este momento.");
  const lado = state.turno;
  const j = jugador(state, lado);
  const enBanca = bancaDe(j).find((c) => c.reptilId === reptilId);
  if (!enBanca && !j.mazo.includes(reptilId)) throw new Error("Ese reptil no está disponible en el mazo.");
  const stats = state.configuracion.reptiles[reptilId];
  const reptil = roster.find((r) => r.id === reptilId);
  if (!stats || !reptil) throw new Error("Reptil desconocido.");

  const jugadorActualizado: JugadorState = {
    ...j,
    mazo: j.mazo.filter((id) => id !== reptilId),
    ...(j.banca ? { banca: j.banca.filter((c) => c.reptilId !== reptilId) } : {}),
    activo: enBanca ?? nuevaCartaEnJuego(reptilId, stats.hp, stats.energiaMax),
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

/** Carta que se retira a la banca: conserva HP, energía y cooldowns, pero pierde estados (veneno, buffs, aturdimiento), como en los juegos de cartas/monstruos. */
export function retirarABanca(carta: CartaEnJuego): CartaEnJuego {
  return { ...carta, estados: [], aturdidoTurnos: 0 };
}

/**
 * Cambia la carta activa por otra del mazo (entra con vida completa) o de la banca (entra con la vida que
 * tenía). Consume el turno. La activa se retira a la banca con su vida actual. No se puede cambiar a la
 * misma carta ni a una derrotada (las derrotadas van al cementerio, nunca están en mazo/banca).
 */
export function cambiar(state: GameState, reptilId: string, roster: Reptil[]): GameState {
  if (!puedeCambiar(state)) throw new Error("No se puede cambiar de carta en este momento.");
  const lado = state.turno;
  const j = jugador(state, lado);
  const saliente = j.activo!;
  if (saliente.reptilId === reptilId) throw new Error("Esa carta ya está en combate.");

  const enBanca = bancaDe(j).find((c) => c.reptilId === reptilId);
  if (!enBanca && !j.mazo.includes(reptilId)) throw new Error("Esa carta no está disponible para entrar.");
  const stats = state.configuracion.reptiles[reptilId];
  const reptil = roster.find((r) => r.id === reptilId);
  if (!stats || !reptil) throw new Error("Reptil desconocido.");
  const nombreSaliente = state.configuracion.reptiles[saliente.reptilId]?.nombre ?? "su reptil";

  const entrante = enBanca ?? nuevaCartaEnJuego(reptilId, stats.hp, stats.energiaMax);
  const nuevaBanca = [...bancaDe(j).filter((c) => c.reptilId !== reptilId), retirarABanca(saliente)];

  const jugadorActualizado: JugadorState = {
    ...j,
    mazo: j.mazo.filter((id) => id !== reptilId),
    banca: nuevaBanca,
    activo: entrante,
  };
  const evento: EventoLog = {
    turno: state.numeroTurno,
    lado,
    tipo: "cambio",
    mensaje: `${j.nombre} retira a ${nombreSaliente} y entra ${reptil.nombre}.`,
  };
  const next = { ...conJugador(state, lado, jugadorActualizado), log: [...state.log, evento] };
  return avanzarTurno(next);
}

export interface ResultadoAtaque {
  state: GameState;
  habilidadId: string;
  danoEsperado: number;
  multiplicadorAfinidad: number;
  stab: number;
  superEfectivo: boolean;
  /** Ventaja / neutral / desventaja de afinidad del atacante sobre el defensor (para el texto "No es muy efectivo..."). */
  tier: MatchupTier;
  /** El defensor esquivó el ataque (por su velocidad): sin daño ni efectos sobre él. */
  esquivado: boolean;
  critico: boolean;
  derrotado: boolean;
  efectoAplicado: { tipo: TipoEstado | "curacion"; magnitud: number } | null;
}

export interface OpcionesAtaque {
  /** Fuente de aleatoriedad (0–1). Inyectable para pruebas deterministas; por defecto Math.random. */
  rng?: () => number;
}

const TIPOS_BUFF = new Set<TipoEstado>(["buff_atk", "buff_def", "buff_spd"]);

/**
 * Resuelve un ataque del jugador en turno usando una de sus habilidades.
 * El daño se calcula con calculateDamage() — el MISMO motor que /simulador — usando siempre las
 * stats congeladas en `state.configuracion` (nunca el `roster`/`abilities` en vivo que reciba el
 * caller), así el combate de cartas nunca diverge matemáticamente del resto del sistema ni de una
 * edición de admin posterior a que la partida ya empezó.
 */
export function atacar(
  state: GameState,
  habilidadId: string,
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
  opciones: OpcionesAtaque = {},
): ResultadoAtaque {
  const rng = opciones.rng ?? Math.random;
  if (!puedeAtacar(state)) throw new Error("No se puede atacar en este momento.");
  const ladoAtacante = state.turno;
  const ladoDefensor = otroLado(ladoAtacante);
  const atacanteState = jugador(state, ladoAtacante);
  const defensorState = jugador(state, ladoDefensor);

  if (!atacanteState.activo) throw new Error("No hay un reptil activo para atacar.");
  if (!defensorState.activo) throw new Error("El rival no tiene un reptil activo para recibir el ataque.");

  const atacanteStats = state.configuracion.reptiles[atacanteState.activo.reptilId];
  const defensorStats = state.configuracion.reptiles[defensorState.activo.reptilId];
  if (!atacanteStats || !defensorStats) throw new Error("Datos de combate incompletos.");
  const habilidad = resolverHabilidad(state.configuracion, atacanteState.activo, atacanteStats, habilidadId);

  const multAtacante = multiplicadorEstado(atacanteState.activo, "atk");
  const multDefensor = multiplicadorEstado(defensorState.activo, "def");
  // calculateDamage sigue esperando `Reptil` completo por su firma pública (compartida con /simulador);
  // se rellenan los campos de UI ausentes en el snapshot con valores neutros, y se aplican los
  // multiplicadores de buff/debuff activos directamente sobre atk/def antes de calcular.
  const atacanteReptil = reptilDesdeStats(atacanteStats, { atk: Math.round(atacanteStats.atk * multAtacante) });
  const defensorReptil = reptilDesdeStats(defensorStats, {
    hp: defensorState.activo.hpActual,
    def: Math.round(defensorStats.def * multDefensor),
  });

  const resultado = calculateDamage(atacanteReptil, defensorReptil, habilidad, config);
  const tier = getAffinityTier(atacanteStats.afinidad, defensorStats.afinidad);
  const superEfectivo = tier === "ventaja";
  // Orden fijo de tiradas (importa para los tests con semilla): 1) crítico, 2) variación ±15 %.
  const criticoTirado = rng() * 100 < atacanteStats.criticoProbabilidad;
  const danoVariado = aplicarVarianza(resultado.danoEsperado, rng);
  // 3) esquiva por velocidad (no en Apoyo). Un ataque esquivado no hace daño, no es crítico y no aplica efectos al rival.
  const esquivado = resolverEsquiva(
    { stats: atacanteStats, carta: atacanteState.activo },
    { stats: defensorStats, carta: defensorState.activo },
    habilidad,
    rng,
  );
  const critico = criticoTirado && !esquivado;
  const danoFinal = esquivado ? 0 : critico ? round2(danoVariado * config.criticoMultiplicador) : danoVariado;

  const nuevoHp = Math.max(0, defensorState.activo.hpActual - danoFinal);
  const derrotado = nuevoHp <= 0;

  let nuevoDefensorState: JugadorState = derrotado
    ? { ...defensorState, activo: null, cementerio: [...defensorState.cementerio, defensorState.activo.reptilId] }
    : { ...defensorState, activo: { ...defensorState.activo, hpActual: nuevoHp } };

  let nuevoAtacanteState: JugadorState = {
    ...atacanteState,
    activo: cartaTrasUsar(atacanteState.activo, habilidad),
  };

  let efectoAplicado: ResultadoAtaque["efectoAplicado"] = null;
  if (habilidad.tipoEfecto && habilidad.efectoMagnitud !== null) {
    if (habilidad.tipoEfecto === "curacion") {
      const hpMax = atacanteStats.hp;
      const curado = Math.min(hpMax, nuevoAtacanteState.activo!.hpActual + Math.round((hpMax * habilidad.efectoMagnitud) / 100));
      nuevoAtacanteState = { ...nuevoAtacanteState, activo: { ...nuevoAtacanteState.activo!, hpActual: curado } };
      efectoAplicado = { tipo: "curacion", magnitud: habilidad.efectoMagnitud };
    } else if (TIPOS_BUFF.has(habilidad.tipoEfecto)) {
      const estado = { tipo: habilidad.tipoEfecto, turnosRestantes: habilidad.efectoTurnos ?? 2, magnitud: habilidad.efectoMagnitud };
      nuevoAtacanteState = {
        ...nuevoAtacanteState,
        activo: { ...nuevoAtacanteState.activo!, estados: [...nuevoAtacanteState.activo!.estados, estado] },
      };
      efectoAplicado = { tipo: habilidad.tipoEfecto, magnitud: habilidad.efectoMagnitud };
    } else if (!derrotado && !esquivado) {
      // veneno / debuff_atk / debuff_def: se aplica sobre el defensor, solo si sigue en pie y no esquivó.
      const estado = { tipo: habilidad.tipoEfecto, turnosRestantes: habilidad.efectoTurnos ?? 2, magnitud: habilidad.efectoMagnitud };
      nuevoDefensorState = {
        ...nuevoDefensorState,
        activo: { ...nuevoDefensorState.activo!, estados: [...nuevoDefensorState.activo!.estados, estado] },
      };
      efectoAplicado = { tipo: habilidad.tipoEfecto, magnitud: habilidad.efectoMagnitud };
    }
  }

  const eventoAtaque: EventoLog = {
    turno: state.numeroTurno,
    lado: ladoAtacante,
    tipo: "ataque",
    mensaje: esquivado
      ? `${atacanteState.nombre} usa ${habilidad.nombre} pero ${defensorStats.nombre} lo esquiva.`
      : `${atacanteState.nombre} usa ${habilidad.nombre} contra ${defensorStats.nombre} (${Math.round(danoFinal)} de daño${critico ? ", ¡CRÍTICO!" : ""}).`,
    detalle: {
      habilidadId,
      danoEsperado: danoFinal,
      multiplicadorAfinidad: resultado.multiplicadorAfinidad,
      stab: resultado.stab,
      superEfectivo,
      critico,
      efectoTipo: efectoAplicado?.tipo,
      efectoMagnitud: efectoAplicado?.magnitud,
    },
  };

  let next = conJugador(state, ladoAtacante, nuevoAtacanteState);
  next = conJugador(next, ladoDefensor, nuevoDefensorState);
  next = { ...next, log: [...next.log, eventoAtaque] };

  if (derrotado) {
    next = {
      ...next,
      log: [...next.log, { turno: state.numeroTurno, lado: ladoDefensor, tipo: "derrota", mensaje: `${defensorStats.nombre} queda fuera de combate.` }],
    };
  }

  next = avanzarTurno(next);

  return {
    state: next,
    habilidadId,
    danoEsperado: danoFinal,
    multiplicadorAfinidad: resultado.multiplicadorAfinidad,
    stab: resultado.stab,
    superEfectivo,
    tier,
    esquivado,
    critico,
    derrotado,
    efectoAplicado,
  };
}

/** Construye un `Reptil` completo (requerido por la firma pública de calculateDamage) a partir del snapshot angosto, con overrides puntuales (HP actual, atk/def ya modificados por estados). Exportada para que las previews de UI usen el mismo snapshot congelado, nunca el roster en vivo. */
export function reptilDesdeStats(
  stats: { id: string; nombre: string; afinidad: Reptil["afinidad"]; hp: number; atk: number; def: number },
  overrides: Partial<Pick<Reptil, "hp" | "atk" | "def">> = {},
): Reptil {
  return {
    id: stats.id,
    numero: 0,
    nombre: stats.nombre,
    nombreCientifico: "",
    familia: "",
    afinidad: stats.afinidad,
    rolTactico: "",
    habitat: "",
    distribucion: "",
    descripcion: "",
    hp: overrides.hp ?? stats.hp,
    atk: overrides.atk ?? stats.atk,
    def: overrides.def ?? stats.def,
    energiaMax: 0,
    criticoProbabilidad: 0,
    spd: 0,
    inst: 0,
    adp: 0,
    bst: 0,
    indiceOfensivo: 0,
    indiceDefensivo: 0,
    indiceMovilidad: 0,
    habilidades: [],
  };
}

/**
 * Reconstruye un `Reptil[]`/`Habilidad[]` "en vivo" a partir del snapshot congelado de la partida —
 * para pasarle a `decidirAccionIA` o a una preview de UI sin arriesgar leer datos post-edición de admin.
 */
export function configuracionARosterYHabilidades(configuracion: Configuracion): { roster: Reptil[]; abilities: Habilidad[] } {
  return {
    roster: Object.values(configuracion.reptiles).map((s) => reptilDesdeStats(s)),
    abilities: Object.values(configuracion.habilidades),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function haPerdido(j: JugadorState): boolean {
  return j.activo === null && j.mazo.length === 0 && bancaDe(j).length === 0;
}

export function verificarGanador(state: GameState): Lado | null {
  const aPerdio = haPerdido(state.jugadorA);
  const bPerdio = haPerdido(state.jugadorB);
  if (aPerdio && !bPerdio) return "B";
  if (bPerdio && !aPerdio) return "A";
  return null;
}

/**
 * Vista pública del estado para un espectador/jugador concreto: oculta el
 * mazo (cartas aún no jugadas) del lado contrario, reemplazando cada id por
 * "?" — mismo largo, sin revelar cuáles son. `activo`/`cementerio` del rival
 * quedan visibles porque ya se jugaron (información legítimamente pública).
 * También redacta `configuracion.reptiles`/`habilidades` al mismo conjunto de ids
 * visibles — si no, el mazo oculto del rival se filtraría por esa puerta aunque
 * `mazo` siga mostrando "?" (los ids completos del snapshot lo delatarían).
 * Esto es lo único que el servidor debe enviar por red al lado que mira.
 */
export function toPublicView(state: GameState, ladoQueMira: Lado): GameState {
  const ladoRival = otroLado(ladoQueMira);
  const rival = jugador(state, ladoRival);
  const rivalRedactado: JugadorState = { ...rival, mazo: rival.mazo.map(() => "?") };
  const conRivalRedactado = conJugador(state, ladoRival, rivalRedactado);

  const propio = jugador(state, ladoQueMira);
  const idsVisibles = new Set<string>([
    ...propio.mazo,
    ...(propio.activo ? [propio.activo.reptilId] : []),
    ...propio.cementerio,
    ...bancaDe(propio).map((c) => c.reptilId),
    ...(rival.activo ? [rival.activo.reptilId] : []),
    ...rival.cementerio,
    ...bancaDe(rival).map((c) => c.reptilId),
  ]);

  const reptiles: Configuracion["reptiles"] = {};
  const habilidades: Configuracion["habilidades"] = {};
  for (const id of idsVisibles) {
    if (state.configuracion.reptiles[id]) reptiles[id] = state.configuracion.reptiles[id];
  }
  for (const h of Object.values(state.configuracion.habilidades)) {
    if (idsVisibles.has(h.propietarioId)) habilidades[h.id] = h;
  }

  return { ...conRivalRedactado, configuracion: { reptiles, habilidades, energiaRegenTurno: state.configuracion.energiaRegenTurno } };
}

/** HP total del "ejército": suma del HP completo de las cartas aún no jugadas más el HP actual de la activa. */
export function totalVidaEjercito(j: JugadorState, roster: Reptil[]): number {
  const vidaMazo = j.mazo.reduce((acc, id) => {
    const r = roster.find((x) => x.id === id);
    return acc + (r?.hp ?? 0);
  }, 0);
  const vidaBanca = bancaDe(j).reduce((acc, c) => acc + c.hpActual, 0);
  return vidaMazo + vidaBanca + (j.activo?.hpActual ?? 0);
}

/** Multiplicador efectivo de una stat tras aplicar sus buffs/debuffs activos (1 = sin cambio). */
export function multiplicadorEstado(carta: CartaEnJuego, stat: "atk" | "def" | "spd"): number {
  let mult = 1;
  for (const e of carta.estados) {
    if (e.tipo === `debuff_${stat}`) mult *= 1 - e.magnitud / 100;
    if (e.tipo === `buff_${stat}`) mult *= 1 + e.magnitud / 100;
  }
  return Math.max(0.1, mult);
}

/** Tickea estados activos de una carta al empezar su turno: aplica veneno, decrementa duraciones/cooldowns, expira lo vencido. */
export function tickearEstados(carta: CartaEnJuego, hpMax: number): { carta: CartaEnJuego; danoVeneno: number } {
  let hpActual = carta.hpActual;
  let danoVeneno = 0;
  const estados = carta.estados
    .map((e) => {
      if (e.tipo === "veneno") {
        const dano = Math.round((hpMax * e.magnitud) / 100);
        danoVeneno += dano;
        hpActual = Math.max(0, hpActual - dano);
      }
      return { ...e, turnosRestantes: e.turnosRestantes - 1 };
    })
    .filter((e) => e.turnosRestantes > 0);

  const cooldowns = Object.fromEntries(
    Object.entries(carta.cooldowns)
      .map(([id, t]) => [id, t - 1] as const)
      .filter(([, t]) => t > 0),
  );

  return { carta: { ...carta, hpActual, estados, cooldowns }, danoVeneno };
}

const PROFUNDIDAD_MAXIMA_ATURDIMIENTO = 4; // cota de seguridad: el aturdimiento dura 1-2 turnos, nunca hay riesgo real de recursión larga

/**
 * Pasa el turno al lado contrario. Para el lado que EMPIEZA turno con una carta activa: regenera
 * energía, tickea estados (aplica veneno, expira duraciones/cooldowns) y, si sigue aturdido, se
 * auto-consume su turno (recursivo, acotado) sin necesitar ninguna acción de la UI ni del servidor —
 * funciona igual en modo local y online porque ambos pasan por aquí.
 */
function avanzarTurno(state: GameState, profundidad = 0): GameState {
  const ganador = verificarGanador(state);
  if (ganador) {
    return {
      ...state,
      ganador,
      fase: "terminado",
      log: [...state.log, { turno: state.numeroTurno, lado: ganador, tipo: "victoria", mensaje: `${jugador(state, ganador).nombre} gana la partida.` }],
    };
  }

  const nuevoLado = otroLado(state.turno);
  const next: GameState = { ...state, turno: nuevoLado, numeroTurno: state.numeroTurno + 1 };

  const activo = jugador(next, nuevoLado).activo;
  if (!activo) return next; // nadie invocado todavía en ese lado: nada que tickear

  const stats = next.configuracion.reptiles[activo.reptilId];
  const hpMax = stats?.hp ?? activo.hpActual;
  const energiaMax = stats?.energiaMax ?? activo.energiaActual;

  const { carta: cartaTickeada, danoVeneno } = tickearEstados(activo, hpMax);
  const energiaRegenerada = Math.min(energiaMax, cartaTickeada.energiaActual + next.configuracion.energiaRegenTurno);
  let cartaFinal: CartaEnJuego = { ...cartaTickeada, energiaActual: energiaRegenerada };

  let conTick = conJugador(next, nuevoLado, { ...jugador(next, nuevoLado), activo: cartaFinal.hpActual > 0 ? cartaFinal : null });

  if (cartaFinal.hpActual <= 0) {
    // El veneno terminó de derrotar a la carta al empezar el turno: va a cementerio, sin acción posible.
    const j = jugador(next, nuevoLado);
    conTick = conJugador(next, nuevoLado, { ...j, activo: null, cementerio: [...j.cementerio, activo.reptilId] });
    conTick = {
      ...conTick,
      log: [...conTick.log, { turno: next.numeroTurno, lado: nuevoLado, tipo: "derrota", mensaje: `${j.nombre} pierde a su reptil por veneno.` }],
    };
    return avanzarTurno(conTick, profundidad + 1);
  }

  if (danoVeneno > 0) {
    conTick = {
      ...conTick,
      log: [
        ...conTick.log,
        {
          turno: next.numeroTurno,
          lado: nuevoLado,
          tipo: "estado",
          mensaje: `${jugador(conTick, nuevoLado).nombre} pierde ${danoVeneno} HP por veneno.`,
          detalle: { efectoTipo: "veneno", efectoMagnitud: danoVeneno },
        },
      ],
    };
  }

  if (cartaFinal.aturdidoTurnos > 0 && profundidad < PROFUNDIDAD_MAXIMA_ATURDIMIENTO) {
    cartaFinal = { ...cartaFinal, aturdidoTurnos: cartaFinal.aturdidoTurnos - 1 };
    conTick = conJugador(conTick, nuevoLado, { ...jugador(conTick, nuevoLado), activo: cartaFinal });
    conTick = {
      ...conTick,
      log: [
        ...conTick.log,
        { turno: conTick.numeroTurno, lado: nuevoLado, tipo: "estado", mensaje: `${jugador(conTick, nuevoLado).nombre} sigue aturdido y pierde el turno.` },
      ],
    };
    return avanzarTurno(conTick, profundidad + 1);
  }

  return conTick;
}
