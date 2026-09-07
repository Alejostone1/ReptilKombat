/** Tipos de fila tal como viven en Postgres (snake_case). Los mapeadores en
 * queries.ts los convierten a los tipos camelCase de `src/types/*`. */
export interface Database {
  public: {
    Tables: {
      reptiles: {
        Row: ReptileRow;
        Insert: Partial<ReptileRow> & Pick<ReptileRow, "id" | "numero" | "nombre" | "nombre_cientifico" | "familia" | "afinidad" | "rol_tactico" | "habitat" | "distribucion" | "descripcion" | "hp" | "atk" | "def" | "spd" | "inst" | "adp">;
        Update: Partial<ReptileRow>;
      };
      abilities: {
        Row: AbilityRow;
        Insert: Partial<AbilityRow> & Pick<AbilityRow, "id" | "nombre" | "propietario_id" | "afinidad" | "potencia" | "precision" | "categoria" | "efecto">;
        Update: Partial<AbilityRow>;
      };
      engine_config: {
        Row: EngineConfigRow;
        Insert: Partial<EngineConfigRow>;
        Update: Partial<EngineConfigRow>;
      };
      game_rooms: {
        Row: GameRoomRow;
        Insert: Partial<GameRoomRow>;
        Update: Partial<GameRoomRow>;
      };
      game_players: {
        Row: GamePlayerRow;
        Insert: Partial<GamePlayerRow>;
        Update: Partial<GamePlayerRow>;
      };
      game_moves: {
        Row: GameMoveRow;
        Insert: Partial<GameMoveRow>;
        Update: Partial<GameMoveRow>;
      };
    };
  };
}

export interface ReptileRow {
  id: string;
  numero: number;
  nombre: string;
  nombre_cientifico: string;
  familia: string;
  genero: string | null;
  afinidad: string;
  rol_tactico: string;
  habitat: string;
  distribucion: string;
  descripcion: string;
  imagen_url: string | null;
  imagen_fuente: string | null;
  imagen_autor: string | null;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  inst: number;
  adp: number;
  pasiva: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export interface AbilityRow {
  id: string;
  nombre: string;
  propietario_id: string;
  afinidad: string;
  potencia: number;
  precision: number;
  categoria: string;
  efecto: string;
  cooldown: number | null;
  prioridad: number | null;
  descripcion: string | null;
}

export interface EngineConfigRow {
  id: number;
  ventaja: number;
  neutral: number;
  desventaja: number;
  stab: number;
  bst_estandar: number;
  win_rate_dominante: number;
  win_rate_debil: number;
  offset_atk_def: number;
  divisor_dano: number;
}

export type EstadoSala = "WAITING" | "READY" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
export type ModoSala = "amigo" | "aleatorio";

export interface GameRoomRow {
  id: string;
  codigo: string;
  estado: unknown;
  estado_sala: EstadoSala;
  modo: ModoSala;
  mazo_a: string[] | null;
  mazo_b: string[] | null;
  ganador: "A" | "B" | null;
  creado_en: string;
  actualizado_en: string;
  finalizado_en: string | null;
}

export interface GamePlayerRow {
  id: string;
  room_id: string;
  nombre: string;
  lado: "A" | "B";
  session_id: string;
  view_token: string;
  conectado_en: string;
}

export interface GameMoveRow {
  id: number;
  room_id: string;
  lado: "A" | "B";
  accion: unknown;
  creado_en: string;
}

export interface MatchmakingQueueRow {
  id: string;
  session_id: string;
  nombre: string;
  mazo: string[];
  creado_en: string;
  emparejado_codigo: string | null;
}
