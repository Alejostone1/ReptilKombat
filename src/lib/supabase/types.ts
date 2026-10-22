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
      match_results: {
        Row: MatchResultRow;
        Insert: Partial<MatchResultRow> & Pick<MatchResultRow, "ganador_lado" | "reptiles_a" | "reptiles_b" | "turnos">;
        Update: Partial<MatchResultRow>;
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
  energia_max: number;
  critico_probabilidad: number;
  /** Familia del animal ('reptil' por defecto): preparada para futuras familias, sin UI todavía. */
  family: string;
  pasiva: string | null;
  activo: boolean;
  fecha_creacion: string;
}

export type TipoEfecto =
  | "veneno"
  | "debuff_atk"
  | "debuff_def"
  | "buff_atk"
  | "buff_def"
  | "buff_spd"
  | "curacion";

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
  costo_energia: number;
  cooldown_turnos: number;
  tipo_efecto: TipoEfecto | null;
  efecto_magnitud: number | null;
  efecto_turnos: number | null;
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
  categoria_normal_mult: number;
  categoria_especial_mult: number;
  categoria_control_mult: number;
  critico_multiplicador: number;
  energia_regen_turno: number;
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
  /** Caducidad de la sala en espera (QR/código). null = sin caducidad. */
  expira_en: string | null;
  formato: string;
}

export interface GamePlayerRow {
  id: string;
  room_id: string;
  nombre: string;
  lado: "A" | "B";
  session_id: string;
  view_token: string;
  conectado_en: string;
  /** Último latido del jugador (ping/acción): base del abandono a los 60 s. */
  last_seen: string;
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

export interface MatchResultRow {
  id: string;
  room_id: string | null;
  ganador_lado: "A" | "B";
  reptiles_a: string[];
  reptiles_b: string[];
  turnos: number;
  duracion_segundos: number | null;
  creado_en: string;
}
