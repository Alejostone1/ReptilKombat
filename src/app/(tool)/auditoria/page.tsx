"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { BalanceStatusBadge } from "@/components/ui/BalanceStatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";

type Filtro = "TODOS" | "APTO" | "REVISAR" | "RIESGO_ALTO";

export default function AuditoriaPage() {
  const { audits, metaHealth, roster } = useEngineData();
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  const visibles = useMemo(() => (filtro === "TODOS" ? audits : audits.filter((a) => a.estado === filtro)), [audits, filtro]);

  const META_LABEL = {
    BALANCEADO: { label: "🟢 BALANCEADO", tone: "ok" as const },
    REQUIERE_REVISION: { label: "🟡 REQUIERE REVISIÓN", tone: "warn" as const },
    DESEQUILIBRADO: { label: "🔴 META DESEQUILIBRADO", tone: "danger" as const },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🛡️ Auditoría de Balance</h1>
          <p className="text-sm text-foreground-muted">Detección automática de extremos estadísticos y dominancia competitiva.</p>
        </div>
        <Badge tone={META_LABEL[metaHealth].tone} className="px-3 py-1.5 text-sm">
          {META_LABEL[metaHealth].label}
        </Badge>
      </div>

      <Tabs
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: "TODOS", label: "Todos" },
          { value: "APTO", label: "🟢 Apto" },
          { value: "REVISAR", label: "🟡 Revisar" },
          { value: "RIESGO_ALTO", label: "🔴 Riesgo alto" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{visibles.length} personajes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Personaje</th>
                  <th className="px-3 py-2 text-left">Afinidad</th>
                  <th className="px-3 py-2 text-right">BST</th>
                  <th className="px-3 py-2 text-right">Máx. Stat</th>
                  <th className="px-3 py-2 text-right">Mín. Stat</th>
                  <th className="px-3 py-2 text-right">Rango</th>
                  <th className="px-3 py-2 text-right">Win Rate</th>
                  <th className="px-3 py-2 text-left">Alertas</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => {
                  const reptil = roster.find((r) => r.id === a.reptilId)!;
                  return (
                    <tr key={a.reptilId} className="border-t border-border-subtle">
                      <td className="px-3 py-2">
                        <Link href={`/reptiles/${reptil.id}`} className="font-medium text-foreground hover:text-reptile-green">
                          {reptil.nombre}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <AffinityBadge afinidad={reptil.afinidad} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{a.bst}</td>
                      <td className="px-3 py-2 text-right font-mono">{a.statMax}</td>
                      <td className="px-3 py-2 text-right font-mono">{a.statMin}</td>
                      <td className="px-3 py-2 text-right font-mono">{a.rango}</td>
                      <td className="px-3 py-2 text-right font-mono">{a.winRate.toFixed(1)}%</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {a.alertas.length === 0 && <span className="text-xs text-foreground-muted">—</span>}
                          {a.alertas.map((al) => (
                            <Badge key={al} tone="warn" className="text-[10px]">
                              {al}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <BalanceStatusBadge estado={a.estado} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
