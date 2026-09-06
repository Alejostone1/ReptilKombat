"use client";

import { useMemo, useState } from "react";
import { getReptilById } from "@/data/roster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { calculateMatchup, classifyMatchupMargin } from "@/lib/game-engine/matchups";
import { ReptileSelector } from "@/components/reptiles/ReptileSelector";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { StatBar } from "@/components/reptiles/StatBar";
import { StatRadar } from "@/components/charts/StatRadar";
import { MatchupCard } from "@/components/combat/MatchupCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const STAT_KEYS = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spd", label: "SPD" },
  { key: "inst", label: "INST" },
  { key: "adp", label: "ADP" },
  { key: "bst", label: "BST" },
] as const;

export default function ComparadorPage() {
  const { config } = useEngineData();
  const [idA, setIdA] = useState<string | null>("dragon-barbudo");
  const [idB, setIdB] = useState<string | null>("uromastyx");

  const a = idA ? getReptilById(idA) : null;
  const b = idB ? getReptilById(idB) : null;

  const matchupAB = useMemo(() => (a && b ? calculateMatchup(a, b, config) : null), [a, b, config]);
  const label = matchupAB ? classifyMatchupMargin(Math.max(matchupAB.probabilidadAtacante, matchupAB.probabilidadDefensor)) : null;

  const radarData =
    a && b
      ? [
          { label: "HP", a: a.hp, b: b.hp },
          { label: "ATK", a: a.atk, b: b.atk },
          { label: "DEF", a: a.def, b: b.def },
          { label: "SPD", a: a.spd, b: b.spd },
          { label: "INST", a: a.inst, b: b.inst },
          { label: "ADP", a: a.adp, b: b.adp },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🆚 Comparador</h1>
        <p className="text-sm text-foreground-muted">Selecciona dos reptiles para comparar estadísticas y combate.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-affinity-agil">Personaje A</p>
          <ReptileSelector value={idA} onChange={setIdA} exclude={idB ?? undefined} />
          {a && (
            <div className="mt-3 flex items-center gap-3">
              <ReptileImage nombre={a.nombre} nombreCientifico={a.nombreCientifico} className="h-16 w-16 rounded-lg" />
              <div>
                <p className="font-semibold text-foreground">{a.nombre}</p>
                <AffinityBadge afinidad={a.afinidad} />
              </div>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-affinity-termico">Personaje B</p>
          <ReptileSelector value={idB} onChange={setIdB} exclude={idA ?? undefined} />
          {b && (
            <div className="mt-3 flex items-center gap-3">
              <ReptileImage nombre={b.nombre} nombreCientifico={b.nombreCientifico} className="h-16 w-16 rounded-lg" />
              <div>
                <p className="font-semibold text-foreground">{b.nombre}</p>
                <AffinityBadge afinidad={b.afinidad} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {a && b && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Comparación de estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-foreground-muted">
                      <th className="text-left font-normal">Stat</th>
                      <th className="font-normal">{a.nombre}</th>
                      <th className="font-normal">{b.nombre}</th>
                      <th className="font-normal">Dif.</th>
                      <th className="font-normal">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAT_KEYS.map((s) => {
                      const va = a[s.key];
                      const vb = b[s.key];
                      const diff = va - vb;
                      const pct = vb !== 0 ? (diff / vb) * 100 : 0;
                      return (
                        <tr key={s.key} className="border-t border-border-subtle">
                          <td className="py-1.5 text-foreground-muted">{s.label}</td>
                          <td className="py-1.5 text-center font-mono text-foreground">{va}</td>
                          <td className="py-1.5 text-center font-mono text-foreground">{vb}</td>
                          <td className={`py-1.5 text-center font-mono ${diff > 0 ? "text-state-ok" : diff < 0 ? "text-state-danger" : "text-foreground-muted"}`}>
                            {diff > 0 ? "+" : ""}
                            {diff}
                          </td>
                          <td className={`py-1.5 text-center font-mono ${pct > 0 ? "text-state-ok" : pct < 0 ? "text-state-danger" : "text-foreground-muted"}`}>
                            {pct > 0 ? "+" : ""}
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="space-y-2">
                  {STAT_KEYS.slice(0, 6).map((s) => (
                    <div key={s.key} className="grid grid-cols-2 gap-2">
                      <StatBar label={s.label} value={a[s.key]} colorClass="bg-affinity-agil" compact />
                      <StatBar label={s.label} value={b[s.key]} colorClass="bg-affinity-termico" compact />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Radar superpuesto</CardTitle>
              </CardHeader>
              <CardContent>
                <StatRadar data={radarData} nameA={a.nombre} nameB={b.nombre} colorA="#2ECC71" colorB="#E67E22" />
              </CardContent>
            </Card>
          </div>

          {matchupAB && label && <MatchupCard a={a} b={b} matchup={matchupAB} label={label} />}
        </>
      )}
    </div>
  );
}
