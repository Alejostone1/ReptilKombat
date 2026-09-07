import { randomBytes, randomInt } from "crypto";
import type { GameRoomRow, GamePlayerRow, MatchmakingQueueRow, EstadoSala, ModoSala } from "./types";
import type { GameState, Lado } from "@/lib/card-game/types";

// Sin caracteres ambiguos (0/O, 1/I/L) para que un jugador pueda dictar/leer el código sin confusión.
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generarCodigoSala(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  }
  return codigo;
}

export function generarViewToken(): string {
  return randomBytes(24).toString("hex");
}

export interface RoomRecord {
  id: string;
  codigo: string;
  estado: GameState | null;
  estadoSala: EstadoSala;
  modo: ModoSala;
  mazoA: string[] | null;
  mazoB: string[] | null;
  ganador: Lado | null;
  creadoEn: string;
  finalizadoEn: string | null;
}

export function rowToRoom(row: GameRoomRow): RoomRecord {
  return {
    id: row.id,
    codigo: row.codigo,
    estado: (row.estado as GameState | null) ?? null,
    estadoSala: row.estado_sala,
    modo: row.modo,
    mazoA: row.mazo_a,
    mazoB: row.mazo_b,
    ganador: row.ganador,
    creadoEn: row.creado_en,
    finalizadoEn: row.finalizado_en,
  };
}

export interface PlayerRecord {
  id: string;
  roomId: string;
  nombre: string;
  lado: Lado;
  sessionId: string;
  viewToken: string;
}

export function rowToPlayer(row: GamePlayerRow): PlayerRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    nombre: row.nombre,
    lado: row.lado,
    sessionId: row.session_id,
    viewToken: row.view_token,
  };
}

export interface QueueRecord {
  id: string;
  sessionId: string;
  nombre: string;
  mazo: string[];
  creadoEn: string;
  emparejadoCodigo: string | null;
}

export function rowToQueueEntry(row: MatchmakingQueueRow): QueueRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    nombre: row.nombre,
    mazo: row.mazo,
    creadoEn: row.creado_en,
    emparejadoCodigo: row.emparejado_codigo,
  };
}

/** Nombre de canal Realtime privado para un asiento: solo quien recibió este view_token puede suscribirse. */
export function canalDeVista(viewToken: string): string {
  return `game:${viewToken}`;
}
