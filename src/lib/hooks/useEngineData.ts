"use client";

import { useMemo } from "react";
import { useConfigStore } from "@/lib/store/config-store";
import { useRoster } from "@/lib/hooks/useRoster";
import { buildMatchupMatrix, calculateWinRate, getBestMatchup, getWorstMatchup } from "@/lib/game-engine/matchups";
import { auditRoster, calculateMetaHealth, countByCompetitiveState } from "@/lib/game-engine/balance";

/**
 * Punto único de acceso a los datos derivados del motor de juego, siempre
 * recalculados con la configuración vigente (lib/store/config-store) y el
 * roster vigente (lib/hooks/useRoster, respaldado por Supabase).
 */
export function useEngineData() {
  const config = useConfigStore((s) => s.config);
  const { roster, loading, error } = useRoster();

  const matrix = useMemo(() => buildMatchupMatrix(roster, config), [roster, config]);
  const audits = useMemo(() => auditRoster(roster, matrix, config), [roster, matrix, config]);
  const metaHealth = useMemo(() => calculateMetaHealth(audits), [audits]);
  const stateCounts = useMemo(() => countByCompetitiveState(audits), [audits]);

  const auditByReptilId = useMemo(() => {
    const map = new Map(audits.map((a) => [a.reptilId, a]));
    return map;
  }, [audits]);

  function winRateOf(id: string) {
    return calculateWinRate(id, matrix);
  }

  function bestMatchupOf(id: string) {
    return getBestMatchup(id, matrix);
  }

  function worstMatchupOf(id: string) {
    return getWorstMatchup(id, matrix);
  }

  return {
    config,
    roster,
    loading,
    error,
    matrix,
    audits,
    auditByReptilId,
    metaHealth,
    stateCounts,
    winRateOf,
    bestMatchupOf,
    worstMatchupOf,
  };
}
