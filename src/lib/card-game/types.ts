import type { Afinidad } from "@/types/affinity";
import type { Habilidad } from "@/types/ability";

export type Lado = "A" | "B";

export type TipoEstado = "veneno" | "debuff_atk" | "debuff_def" | "buff_atk" | "buff_def" | "buff_spd";

export interface EstadoActivo {
  tipo: TipoEstado;
  turnosRestantes: number;
  /** % o valor plano según `tipo` (p. ej. veneno = % de HP máx. por turno, debuff/buff = % de la stat). */
  magnitud: number;
}

export interface CartaEnJuego {
  reptilId: string;
  hpActual: number;
  energiaActual: number;
  /** habilidadId -> turnos de cooldown restantes. Ausente o 0 = lista para usar. */
  cooldowns: Record<string, number>;
  estados: EstadoActivo[];
  /** Turnos que la carta sigue aturdida (0 = no aturdida): al empezar su turno lo pierde automáticamente. */
  aturdidoTurnos: number;
}

export interface JugadorState {
  nombre: string;
  mazo: string[]; // ids de reptiles aún no invocados
  activo: CartaEnJuego | null;
  cementerio: string[]; // ids de reptiles derrotados
}

export type FaseJuego = "invocando" | "combatiendo" | "terminado";

export interface EventoLog {
  turno: number;
  lado: Lado;
  tipo: "invocacion" | "ataque" | "derrota" | "victoria" | "estado";
  mensaje: string;
  detalle?: {
    habilidadId?: string;
    danoEsperado?: number;
    multiplicadorAfinidad?: number;
    stab?: number;
    superEfectivo?: boolean;
    critico?: boolean;
    efectoTipo?: TipoEstado | "curacion";
    efectoMagnitud?: number;
  };
}

/** Estadísticas de combate congeladas al crear la partida — sin campos de UI (imagen, descripción, etc). */
export interface CombatStats {
  id: string;
  nombre: string;
  afinidad: Afinidad;
  hp: number;
  atk: number;
  def: number;
  energiaMax: number;
  criticoProbabilidad: number;
}

/**
 * Snapshot de stats/habilidades tomado en `crearPartida()`: el resto de la partida
 * lee de aquí, nunca del roster en vivo, para que un cambio del admin a mitad de
 * partida no altere una partida ya en curso (ver GameState.configuracion).
 */
export interface Configuracion {
  reptiles: Record<string, CombatStats>;
  habilidades: Record<string, Habilidad>;
  /** Energía que regenera un lado al empezar su turno — congelado igual que el resto, ver Configuracion. */
  energiaRegenTurno: number;
}

export interface GameState {
  jugadorA: JugadorState;
  jugadorB: JugadorState;
  turno: Lado;
  numeroTurno: number;
  fase: FaseJuego;
  ganador: Lado | null;
  log: EventoLog[];
  configuracion: Configuracion;
}

export const MAX_CARTAS_MAZO = 4;
