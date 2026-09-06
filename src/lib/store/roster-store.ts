"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { fetchAbilities, fetchReptilesBase } from "@/lib/supabase/queries";
import type { ReptilBase } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";

type Status = "idle" | "loading" | "ready" | "error";

interface RosterStoreState {
  reptilesBase: ReptilBase[];
  abilities: Habilidad[];
  status: Status;
  error: string | null;
  load: () => Promise<void>;
  /** Vuelve a leer de Supabase de inmediato (usado por /admin tras crear/editar/eliminar). */
  refetch: () => Promise<void>;
}

export const useRosterStore = create<RosterStoreState>()((set, get) => ({
  reptilesBase: [],
  abilities: [],
  status: "idle",
  error: null,
  async load() {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const supabase = createClient();
      const [reptilesBase, abilities] = await Promise.all([
        fetchReptilesBase(supabase),
        fetchAbilities(supabase),
      ]);
      set({ reptilesBase, abilities, status: "ready" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Error desconocido" });
    }
  },
  async refetch() {
    // A diferencia de `load`, no depende de que un useEffect vuelva a montarse:
    // pasa por "idle" y llama a load() en el mismo tick para forzar la relectura.
    set({ status: "idle" });
    await get().load();
  },
}));
