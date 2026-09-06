"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { BalanceStatusBadge } from "@/components/ui/BalanceStatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { AFFINITIES } from "@/types/affinity";

type Criterio = "general" | "ofensiva" | "defensa" | "velocidad" | "movilidad" | "afinidad";

const CRITERIOS: { value: Criterio; label: string }[] = [
  { value: "general", label: "General (Win Rate)" },
  { value: "ofensiva", label: "Ofensiva" },
  { value: "defensa", label: "Defensa" },
  { value: "velocidad", label: "Velocidad" },
  { value: "movilidad", label: "Movilidad" },
  { value: "afinidad", label: "Por Afinidad" },
];

export default function RankingPage() {
  const { roster, auditByReptilId, bestMatchupOf, worstMatchupOf, winRateOf } = useEngineData();
  const [criterio, setCriterio] = useState<Criterio>("general");

  const rows = useMemo(
    () =>
      roster.map((r) => ({
        reptil: r,
        winRate: winRateOf(r.id),
        mejor: bestMatchupOf(r.id),
        peor: worstMatchupOf(r.id),
        estado: auditByReptilId.get(r.id)?.estado ?? "APTO",
      })),
    [roster, winRateOf, bestMatchupOf, worstMatchupOf, auditByReptilId],
  );

  const sorted = useMemo(() => {
    const arr = [...rows];
    switch (criterio) {
      case "ofensiva":
        return arr.sort((a, b) => b.reptil.indiceOfensivo - a.reptil.indiceOfensivo);
      case "defensa":
        return arr.sort((a, b) => b.reptil.indiceDefensivo - a.reptil.indiceDefensivo);
      case "velocidad":
        return arr.sort((a, b) => b.reptil.spd - a.reptil.spd);
      case "movilidad":
        return arr.sort((a, b) => b.reptil.indiceMovilidad - a.reptil.indiceMovilidad);
      case "afinidad":
        return arr.sort((a, b) => AFFINITIES.indexOf(a.reptil.afinidad) - AFFINITIES.indexOf(b.reptil.afinidad) || b.winRate - a.winRate);
      default:
        return arr.sort((a, b) => b.winRate - a.winRate);
    }
  }, [rows, criterio]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🏆 Ranking</h1>
        <p className="text-sm text-foreground-muted">Clasificación competitiva alimentada por la matriz de matchups.</p>
      </div>

      <Tabs value={criterio} onChange={setCriterio} options={CRITERIOS} />

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-panel-secondary text-xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-3 py-2 text-left">Pos.</th>
              <th className="px-3 py-2 text-left">Personaje</th>
              <th className="px-3 py-2 text-left">Afinidad</th>
              <th className="px-3 py-2 text-left">Rol</th>
              <th className="px-3 py-2 text-right">Win Rate</th>
              <th className="px-3 py-2 text-left">Mejor matchup</th>
              <th className="px-3 py-2 text-left">Peor matchup</th>
              <th className="px-3 py-2 text-right">BST</th>
              <th className="px-3 py-2 text-right">Ofensiva</th>
              <th className="px-3 py-2 text-right">Defensa</th>
              <th className="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const mejorR = row.mejor ? roster.find((r) => r.id === row.mejor!.reptilId) : null;
              const peorR = row.peor ? roster.find((r) => r.id === row.peor!.reptilId) : null;
              return (
                <tr key={row.reptil.id} className="border-t border-border-subtle hover:bg-panel-secondary/60">
                  <td className="px-3 py-2 text-foreground-muted">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/reptiles/${row.reptil.id}`} className="font-medium text-foreground hover:text-reptile-green">
                      {row.reptil.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <AffinityBadge afinidad={row.reptil.afinidad} />
                  </td>
                  <td className="px-3 py-2 text-foreground-muted">{row.reptil.rolTactico}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{row.winRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-xs text-state-ok">
                    {mejorR ? `${mejorR.nombre} (${row.mejor!.probabilidad.toFixed(0)}%)` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-state-danger">
                    {peorR ? `${peorR.nombre} (${row.peor!.probabilidad.toFixed(0)}%)` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">{row.reptil.bst}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground-muted">{row.reptil.indiceOfensivo}</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground-muted">{row.reptil.indiceDefensivo}</td>
                  <td className="px-3 py-2">
                    <BalanceStatusBadge estado={row.estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
