"use client";

import { useMemo, useState } from "react";
import type { Reptil } from "@/types/reptile";
import { cn } from "@/lib/utils";

interface MatchupHeatmapProps {
  roster: Reptil[];
  matrix: Record<string, Record<string, number>>;
  onSelectCell?: (atacanteId: string, defensorId: string) => void;
}

function colorFor(prob: number): string {
  if (prob === 50) return "bg-panel-secondary text-foreground-muted";
  if (prob < 45) return "bg-state-danger/70 text-white";
  if (prob <= 55) return "bg-state-warn/60 text-[#04120b]";
  return "bg-state-ok/70 text-[#04120b]";
}

export function MatchupHeatmap({ roster, matrix, onSelectCell }: MatchupHeatmapProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ a: string; b: string } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.nombre.toLowerCase().includes(q) || r.afinidad.toLowerCase().includes(q));
  }, [roster, query]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar personajes en la matriz..."
        className="w-full max-w-sm rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-reptile-green/60"
      />
      <div className="overflow-auto rounded-xl border border-border-subtle" style={{ maxHeight: 640 }}>
        <table className="border-collapse text-[10px]">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr>
              <th className="sticky left-0 z-20 min-w-32 border border-border-subtle bg-panel px-2 py-1 text-left text-foreground-muted">
                Ataca ↓ / Defiende →
              </th>
              {visible.map((def) => (
                <th
                  key={def.id}
                  className="min-w-9 border border-border-subtle bg-panel px-1 py-1 font-normal text-foreground-muted"
                  title={def.nombre}
                >
                  <span className="block max-w-9 truncate">{def.nombre.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((atk) => (
              <tr key={atk.id}>
                <th className="sticky left-0 z-10 min-w-32 border border-border-subtle bg-panel px-2 py-1 text-left font-normal text-foreground">
                  {atk.nombre}
                </th>
                {visible.map((def) => {
                  const prob = matrix[atk.id]?.[def.id] ?? 50;
                  const isSelected = selected?.a === atk.id && selected?.b === def.id;
                  return (
                    <td key={def.id} className="border border-border-subtle p-0">
                      <button
                        title={`${atk.nombre} vs ${def.nombre}: ${prob.toFixed(0)}%`}
                        onClick={() => {
                          setSelected({ a: atk.id, b: def.id });
                          onSelectCell?.(atk.id, def.id);
                        }}
                        className={cn(
                          "flex h-8 w-9 items-center justify-center font-mono transition-transform hover:z-10 hover:scale-110",
                          colorFor(prob),
                          isSelected && "ring-2 ring-white",
                        )}
                      >
                        {prob.toFixed(0)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-state-danger/70" /> 0–44% desfavorable</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-state-warn/60" /> 45–55% parejo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-state-ok/70" /> 56–100% favorable</span>
      </div>
    </div>
  );
}
