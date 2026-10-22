"use client";

import { create } from "zustand";
import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import type { GameState, Lado } from "@/lib/card-game/types";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { crearPartida, invocar as invocarEngine, atacar as atacarEngine, type ResultadoAtaque } from "@/lib/card-game/engine";
import type { PersonalidadIA } from "@/lib/card-game/ai";
import { nivelDeGolpe, recordarAtaque, type MemoriaAtaques } from "@/lib/card-game/memoria-ataques";

interface GameStoreState {
  mazoA: string[];
  mazoB: string[];
  nombreA: string;
  nombreB: string;
  state: GameState | null;
  ultimoResultado: ResultadoAtaque | null;
  /**
   * El motor limpia `activo` a null en el mismo paso en que un reptil llega a 0 HP
   * (pasa directo a cementerio), así que el Board nunca vería una carta con HP 0 sin esto:
   * guarda quién fue derrotado en el último ataque para que la carta se muestre brevemente
   * en su estado "derrotada" antes de desaparecer del tablero.
   */
  ultimoDerrotado: { lado: Lado; reptilId: string } | null;
  /** Quién atacó en el último ataque (tras atacar el turno ya pasó al rival) + contador para re-disparar animaciones. */
  ultimoAtaque: { id: number; atacante: Lado } | null;
  /** Lo que cada jugador ha aprendido de sus ataques (por id de habilidad; son únicos por reptil, no se cruzan entre jugadores). */
  memoria: MemoriaAtaques;
  /** true justo después de una acción: se muestra la pantalla "pasa el dispositivo" antes de revelar el tablero al siguiente jugador. */
  pantallaTransicion: boolean;
  /** Cuando está activo, `ladoIA` juega solo (ver useIaAutoplay) — no se muestra "pasa el dispositivo" en su turno. */
  modoIA: boolean;
  ladoIA: Lado | null;
  personalidadIA: PersonalidadIA;

  setNombreA: (n: string) => void;
  setNombreB: (n: string) => void;
  toggleCarta: (lado: Lado, reptilId: string) => void;
  puedeIniciar: () => boolean;
  iniciar: (nombreA: string, nombreB: string, roster: Reptil[], abilities: Habilidad[], config: EngineConfig) => void;
  iniciarVsIA: (
    mazoJugador: string[],
    nombreJugador: string,
    mazoIA: string[],
    roster: Reptil[],
    abilities: Habilidad[],
    config: EngineConfig,
    personalidad?: PersonalidadIA,
  ) => void;
  confirmarTurno: () => void;
  invocar: (reptilId: string, roster: Reptil[]) => void;
  atacar: (habilidadId: string, roster: Reptil[], abilities: Habilidad[], config: EngineConfig) => void;
  limpiarUltimoDerrotado: () => void;
  reiniciar: () => void;
}

function otroLado(lado: Lado): Lado {
  return lado === "A" ? "B" : "A";
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
  mazoA: [],
  mazoB: [],
  nombreA: "Jugador A",
  nombreB: "Jugador B",
  state: null,
  ultimoResultado: null,
  ultimoDerrotado: null,
  ultimoAtaque: null,
  memoria: {},
  pantallaTransicion: false,
  modoIA: false,
  ladoIA: null,
  personalidadIA: "equilibrada",

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

  iniciar: (nombreA, nombreB, roster, abilities, config) => {
    const s = get();
    const state = crearPartida(s.mazoA, s.mazoB, roster, abilities, config, nombreA, nombreB);
    set({
      state,
      nombreA,
      nombreB,
      ultimoResultado: null,
      ultimoDerrotado: null,
      ultimoAtaque: null,
      memoria: {},
      pantallaTransicion: false,
      modoIA: false,
      ladoIA: null,
    });
  },

  iniciarVsIA: (mazoJugador, nombreJugador, mazoIA, roster, abilities, config, personalidad = "equilibrada") => {
    const state = crearPartida(mazoJugador, mazoIA, roster, abilities, config, nombreJugador, "IA");
    set({
      state,
      mazoA: mazoJugador,
      mazoB: mazoIA,
      nombreA: nombreJugador,
      nombreB: "IA",
      ultimoResultado: null,
      ultimoDerrotado: null,
      ultimoAtaque: null,
      memoria: {},
      pantallaTransicion: false,
      modoIA: true,
      ladoIA: "B",
      personalidadIA: personalidad,
    });
  },

  confirmarTurno: () => set({ pantallaTransicion: false }),

  invocar: (reptilId, roster) => {
    const s = get();
    if (!s.state) return;
    const nuevoEstado = invocarEngine(s.state, reptilId, roster);
    set({ state: nuevoEstado, ultimoResultado: null, ultimoDerrotado: null, pantallaTransicion: !s.modoIA });
  },

  atacar: (habilidadId, roster, abilities, config) => {
    const s = get();
    if (!s.state) return;
    const ladoDefensor = otroLado(s.state.turno);
    const reptilIdDefensor = jugadorDe(s.state, ladoDefensor).activo?.reptilId ?? null;
    const resultado = atacarEngine(s.state, habilidadId, roster, abilities, config);
    const hpMaxDefensor = s.state.configuracion.reptiles[reptilIdDefensor ?? ""]?.hp ?? 0;
    const nivel = nivelDeGolpe(resultado.danoEsperado, resultado.critico, config.criticoMultiplicador, hpMaxDefensor);
    set({
      state: resultado.state,
      ultimoResultado: resultado,
      ultimoAtaque: { id: (s.ultimoAtaque?.id ?? 0) + 1, atacante: s.state.turno },
      memoria: recordarAtaque(s.memoria, habilidadId, nivel),
      ultimoDerrotado: resultado.derrotado && reptilIdDefensor ? { lado: ladoDefensor, reptilId: reptilIdDefensor } : null,
      pantallaTransicion: !s.modoIA,
    });
  },

  limpiarUltimoDerrotado: () => set({ ultimoDerrotado: null }),

  reiniciar: () =>
    set({
      mazoA: [],
      mazoB: [],
      state: null,
      ultimoResultado: null,
      ultimoDerrotado: null,
      ultimoAtaque: null,
      memoria: {},
      pantallaTransicion: false,
      modoIA: false,
      ladoIA: null,
    }),
}));

function jugadorDe(state: GameState, lado: Lado) {
  return lado === "A" ? state.jugadorA : state.jugadorB;
}
