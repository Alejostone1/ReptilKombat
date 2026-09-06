"use client";

import { useState } from "react";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { calculateMatchup, classifyMatchupMargin } from "@/lib/game-engine/matchups";
import { MatchupHeatmap } from "@/components/combat/MatchupHeatmap";
import { MatchupCard } from "@/components/combat/MatchupCard";

export default function MatchupsPage() {
  const { roster, matrix, config } = useEngineData();
  const [selected, setSelected] = useState<{ a: string; b: string } | null>(null);

  const a = selected ? roster.find((r) => r.id === selected.a) : null;
  const b = selected ? roster.find((r) => r.id === selected.b) : null;
  const matchup = a && b ? calculateMatchup(a, b, config) : null;
  const label = matchup ? classifyMatchupMargin(Math.max(matchup.probabilidadAtacante, matchup.probabilidadDefensor)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🔥 Matchups</h1>
        <p className="text-sm text-foreground-muted">
          Matriz {roster.length} × {roster.length}: probabilidad teórica de victoria del atacante (fila) sobre el defensor (columna). Haz clic en una celda para ver el detalle.
        </p>
      </div>

      <MatchupHeatmap roster={roster} matrix={matrix} onSelectCell={(x, y) => setSelected({ a: x, b: y })} />

      {a && b && matchup && label && <MatchupCard a={a} b={b} matchup={matchup} label={label} />}
    </div>
  );
}
