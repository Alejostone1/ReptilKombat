import type { Afinidad } from "./affinity";

/** Datos base de un reptil tal como se almacenan en /data (sin campos derivados). */
export interface ReptilBase {
  id: string;
  numero: number;

  nombre: string;
  nombreCientifico: string;

  familia: string;
  genero?: string;

  afinidad: Afinidad;

  rolTactico: string;

  habitat: string;
  distribucion: string;

  descripcion: string;

  imagenUrl?: string;
  imagenFuente?: string;
  imagenAutor?: string;

  hp: number;
  atk: number;
  def: number;
  spd: number;
  inst: number;
  adp: number;

  /** Energía máxima disponible por combate: gasta al usar ataques Especial/Control/Estado. */
  energiaMax: number;
  /** Probabilidad (%) de que cualquier ataque de este reptil sea crítico. */
  criticoProbabilidad: number;

  pasiva?: string;

  /** Solo relevante en /admin: si es false, el reptil no aparece en el roster público ni en cálculos. */
  activo?: boolean;

  fechaCreacion?: string;
}

/** Reptil completo con estadísticas derivadas, calculadas exclusivamente por el motor de juego. */
export interface Reptil extends ReptilBase {
  bst: number;
  indiceOfensivo: number;
  indiceDefensivo: number;
  indiceMovilidad: number;
  habilidades: string[];
}

export type EstadoBalance = "APTO" | "REVISAR" | "RIESGO_ALTO";

export interface AuditoriaPersonaje {
  reptilId: string;
  bst: number;
  bstEsperado: number;
  statMax: number;
  statMin: number;
  rango: number;
  winRate: number;
  estado: EstadoBalance;
  alertas: string[];
}
