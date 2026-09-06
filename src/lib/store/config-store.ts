"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from "@/lib/game-engine/config";

interface ConfigState {
  config: EngineConfig;
  setConfig: (partial: Partial<EngineConfig>) => void;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_ENGINE_CONFIG,
      setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),
      resetConfig: () => set({ config: DEFAULT_ENGINE_CONFIG }),
    }),
    { name: "reptiles-rpg-engine-config" },
  ),
);
