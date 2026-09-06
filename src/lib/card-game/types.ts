export type Lado = "A" | "B";

export interface CartaEnJuego {
  reptilId: string;
  hpActual: number;
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
  tipo: "invocacion" | "ataque" | "derrota" | "victoria";
  mensaje: string;
  detalle?: {
    habilidadId?: string;
    danoEsperado?: number;
    multiplicadorAfinidad?: number;
    stab?: number;
    superEfectivo?: boolean;
  };
}

export interface GameState {
  jugadorA: JugadorState;
  jugadorB: JugadorState;
  turno: Lado;
  numeroTurno: number;
  fase: FaseJuego;
  ganador: Lado | null;
  log: EventoLog[];
}

export const MAX_CARTAS_MAZO = 5;
