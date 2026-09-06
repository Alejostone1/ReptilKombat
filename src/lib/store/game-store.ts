"use client";

import { create } from "zustand";
import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import type { GameState, Lado } from "@/lib/card-game/types";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { crearPartida, invocar as invocarEngine, atacar as atacarEngine, type ResultadoAtaque } from "@/lib/card-game/engine";

interface GameStoreState {
  mazoA: string[];
  mazoB: string[];
  nombreA: string;
  nombreB: string;
  state: GameState | null;
  ultimoResultado: ResultadoAtaque | null;
  /** true justo después de una acción: se muestra la pantalla "pasa el dispositivo" antes de revelar el tablero al siguiente jugador. */
  pantallaTransicion: boolean;

  setNombreA: (n: string) => void;
  setNombreB: (n: string) => void;
  toggleCarta: (lado: Lado, reptilId: string) => void;
  puedeIniciar: () => boolean;
  iniciar: (nombreA: string, nombreB: string) => void;
  confirmarTurno: () => void;
  invocar: (reptilId: string, roster: Reptil[]) => void;
  atacar: (habilidadId: string, roster: Reptil[], abilities: Habilidad[], config: EngineConfig) => void;
  reiniciar: () => void;
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  mazoA: [],
  mazoB: [],
  nombreA: "Jugador A",
  nombreB: "Jugador B",
  state: null,
  ultimoResultado: null,
  pantallaTransicion: false,

  setNombreA: (n) => set({ nombreA: n }),
  setNombreB: (n) => set({ nombreB: n }),

  toggleCarta: (lado, reptilId) =>
    set((s) => {
      const key = lado === "A" ? "mazoA" : "mazoB";
      const otroKey = lado === "A" ? "mazoB" : "mazoA";
      const actual = s[key];
      const yaElegida = actual.includes(reptilId);
      if (yaElegida) return { [key]: actual.filter((id) => id !== reptilId) } as Partial<GameStoreState>;
      if (actual.length >= MAX_CARTAS_MAZO) return {};
      // Evita que ambos jugadores elijan el mismo reptil en la misma partida.
      if (s[otroKey].includes(reptilId)) return {};
      return { [key]: [...actual, reptilId] } as Partial<GameStoreState>;
    }),

  puedeIniciar: () => {
    const s = get();
    return s.mazoA.length > 0 && s.mazoB.length > 0;
  },

  iniciar: (nombreA, nombreB) => {
    const s = get();
    const state = crearPartida(s.mazoA, s.mazoB, nombreA, nombreB);
    set({ state, nombreA, nombreB, ultimoResultado: null, pantallaTransicion: false });
  },

  confirmarTurno: () => set({ pantallaTransicion: false }),

  invocar: (reptilId, roster) => {
    const s = get();
    if (!s.state) return;
    const nuevoEstado = invocarEngine(s.state, reptilId, roster);
    set({ state: nuevoEstado, ultimoResultado: null, pantallaTransicion: true });
  },

  atacar: (habilidadId, roster, abilities, config) => {
    const s = get();
    if (!s.state) return;
    const resultado = atacarEngine(s.state, habilidadId, roster, abilities, config);
    set({ state: resultado.state, ultimoResultado: resultado, pantallaTransicion: true });
  },

  reiniciar: () => set({ mazoA: [], mazoB: [], state: null, ultimoResultado: null, pantallaTransicion: false }),
}));
