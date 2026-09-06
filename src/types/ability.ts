import type { Afinidad } from "./affinity";

export type CategoriaHabilidad = "Fisica" | "Tecnica" | "Control" | "Estado";

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
}
