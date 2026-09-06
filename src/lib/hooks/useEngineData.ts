"use client";

import { useMemo } from "react";
import { useConfigStore } from "@/lib/store/config-store";
import { ROSTER } from "@/data/roster";
import { buildMatchupMatrix, calculateWinRate, getBestMatchup, getWorstMatchup } from "@/lib/game-engine/matchups";
import { auditRoster, calculateMetaHealth, countByCompetitiveState } from "@/lib/game-engine/balance";

/**
 * Punto único de acceso a los datos derivados del motor de juego, siempre
 * recalculados con la configuración vigente (lib/store/config-store).
 */
export function useEngineData() {
  const config = useConfigStore((s) => s.config);

  const matrix = useMemo(() => buildMatchupMatrix(ROSTER, config), [config]);
  const audits = useMemo(() => auditRoster(ROSTER, matrix, config), [matrix, config]);
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
    roster: ROSTER,
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
