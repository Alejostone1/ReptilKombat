import { FEATURES } from "./features";

/**
 * Registro de modos de juego. Sirve para que agregar un modo nuevo sea declarar una entrada aquí
 * (y su lógica aparte), sin tocar el motor. Los modos "futuros" quedan apagados detrás de
 * FUTURE_MODES y NO tienen interfaz todavía.
 */
export type IdModo = "1v1" | "ia" | "2v2" | "todos-contra-todos" | "solo-una-familia";

export interface DefinicionModo {
  id: IdModo;
  nombre: string;
  jugadores: number;
  habilitado: boolean;
}

export const MODOS: DefinicionModo[] = [
  { id: "1v1", nombre: "1 vs 1", jugadores: 2, habilitado: true },
  { id: "ia", nombre: "Contra la IA", jugadores: 1, habilitado: true },
  { id: "2v2", nombre: "2 vs 2", jugadores: 4, habilitado: FEATURES.MODE_2V2 },
  { id: "todos-contra-todos", nombre: "Todos contra todos", jugadores: 4, habilitado: FEATURES.FUTURE_MODES },
  { id: "solo-una-familia", nombre: "Solo una familia", jugadores: 2, habilitado: FEATURES.FUTURE_MODES },
];

export function modosHabilitados(): DefinicionModo[] {
  return MODOS.filter((m) => m.habilitado);
}
