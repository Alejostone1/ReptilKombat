"use client";

import { useEffect, useMemo } from "react";
import { useRosterStore } from "@/lib/store/roster-store";
import { buildReptil } from "@/lib/game-engine/stats";
import type { Reptil } from "@/types/reptile";

export interface UseRosterResult {
  roster: Reptil[];
  abilities: ReturnType<typeof useRosterStore.getState>["abilities"];
  abilitiesByOwner: (reptilId: string) => ReturnType<typeof useRosterStore.getState>["abilities"];
  getReptilById: (id: string) => Reptil | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Único punto de entrada al roster en toda la app. Dispara la carga desde
 * Supabase la primera vez que se usa (vía RosterProvider en el layout) y
 * expone los mismos `Reptil[]` computados que antes venían de data/roster.ts.
 */
export function useRoster(): UseRosterResult {
  const { reptilesBase, abilities, status, error, load } = useRosterStore();

  useEffect(() => {
    load();
  }, [load]);

  const roster = useMemo(() => reptilesBase.map((base) => buildReptil(base, abilities)), [reptilesBase, abilities]);

  return {
    roster,
    abilities,
    abilitiesByOwner: (reptilId: string) => abilities.filter((a) => a.propietarioId === reptilId),
    getReptilById: (id: string) => roster.find((r) => r.id === id),
    loading: status === "loading" || status === "idle",
    error,
  };
}

export function useReptilById(id: string | null | undefined) {
  const { roster, loading, error } = useRoster();
  const reptil = useMemo(() => roster.find((r) => r.id === id) ?? null, [roster, id]);
  return { reptil, loading, error };
}
