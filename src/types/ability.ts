import type { Afinidad } from "./affinity";

/**
 * Fisica = Normal (sin costo/cooldown) · Tecnica = Especial (daño alto, energía+cooldown) ·
 * Control = debuff/veneno sobre el rival · Estado = autobuff/curación sobre uno mismo.
 */
export type CategoriaHabilidad = "Fisica" | "Tecnica" | "Control" | "Estado";

export type TipoEfecto =
  | "veneno"
  | "debuff_atk"
  | "debuff_def"
  | "buff_atk"
  | "buff_def"
  | "buff_spd"
  | "curacion";

export interface Habilidad {
  id: string;
  nombre: string;
  propietarioId: string;
  afinidad: Afinidad;
  potencia: number;
  precision: number;
  categoria: CategoriaHabilidad;
  efecto: string;
  cooldown?: number;
  prioridad?: number;
  descripcion?: string;
  /** Energía que consume usarla (0 = gratis, como los ataques Fisica/Normal). */
  costoEnergia: number;
  /** Turnos de cooldown tras usarla (0 = siempre disponible). */
  cooldownTurnos: number;
  /** Efecto mecánico real que aplica, si tiene uno (null = solo daño directo). */
  tipoEfecto: TipoEfecto | null;
  /** Magnitud del efecto (% o valor plano según tipoEfecto). */
  efectoMagnitud: number | null;
  /** Duración en turnos del efecto (null/0 = instantáneo, p. ej. curación). */
  efectoTurnos: number | null;
}
