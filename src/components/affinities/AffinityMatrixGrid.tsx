"use client";

import { AFFINITIES, AFFINITY_META } from "@/types/affinity";
import type { EngineConfig } from "@/lib/game-engine/config";
import { getAffinityMultiplier, getAffinityTier, explainMatchup } from "@/lib/game-engine/affinities";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

const TIER_CLASS = {
  ventaja: "bg-state-ok/25 text-state-ok border-state-ok/40",
  neutral: "bg-panel-secondary text-foreground-muted border-border-subtle",
  desventaja: "bg-state-danger/20 text-state-danger border-state-danger/40",
};

const TIER_ICON = { ventaja: "🟢", neutral: "⚪", desventaja: "🔴" };

export function AffinityMatrixGrid({ config }: { config: EngineConfig }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="min-w-40 border border-border-subtle bg-panel px-2 py-2 text-left text-foreground-muted">
              Ataca ↓ / Defiende →
            </th>
            {AFFINITIES.map((def) => (
              <th key={def} className="min-w-20 border border-border-subtle bg-panel px-2 py-2 text-center font-medium" style={{ color: AFFINITY_META[def].color }}>
                {AFFINITY_META[def].emoji} {def}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {AFFINITIES.map((atk) => (
            <tr key={atk}>
              <th className="min-w-40 border border-border-subtle bg-panel px-2 py-2 text-left font-medium" style={{ color: AFFINITY_META[atk].color }}>
                {AFFINITY_META[atk].emoji} {atk}
              </th>
              {AFFINITIES.map((def) => {
                const tier = getAffinityTier(atk, def);
                const mult = getAffinityMultiplier(atk, def, config);
                return (
                  <td key={def} className="border border-border-subtle p-0 text-center">
                    <Tooltip
                      content={
                        <div className="w-56 space-y-1">
                          <p className="font-semibold text-foreground">
                            {atk} → {def}
                          </p>
                          <p className="text-foreground-muted">Multiplicador: ×{mult.toFixed(2)}</p>
                          <p className="text-foreground-muted">{explainMatchup(atk, def)}</p>
                        </div>
                      }
                    >
                      <div className={cn("flex h-14 w-20 flex-col items-center justify-center gap-0.5 border font-mono", TIER_CLASS[tier])}>
                        <span>{TIER_ICON[tier]}</span>
                        <span>×{mult.toFixed(2)}</span>
                      </div>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
