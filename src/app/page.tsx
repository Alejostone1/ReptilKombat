"use client";

import { useMemo } from "react";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { ABILITIES } from "@/data/abilities";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AffinityDistributionChart } from "@/components/charts/AffinityDistributionChart";
import { StatsByAffinityChart } from "@/components/charts/StatsByAffinityChart";
import { AffinityRadarChart } from "@/components/charts/AffinityRadarChart";
import { BstHistogram } from "@/components/charts/BstHistogram";
import { RankedList } from "@/components/dashboard/RankedList";
import { Badge } from "@/components/ui/Badge";
import { AFFINITIES } from "@/types/affinity";

const META_HEALTH_CONFIG = {
  BALANCEADO: { label: "🟢 BALANCEADO", tone: "ok" as const },
  REQUIERE_REVISION: { label: "🟡 REQUIERE REVISIÓN", tone: "warn" as const },
  DESEQUILIBRADO: { label: "🔴 META DESEQUILIBRADO", tone: "danger" as const },
};

export default function DashboardPage() {
  const { roster, metaHealth, stateCounts, winRateOf } = useEngineData();

  const avgBst = useMemo(() => Math.round(roster.reduce((a, r) => a + r.bst, 0) / roster.length), [roster]);

  const ranked = useMemo(
    () =>
      [...roster]
        .map((r) => ({ reptil: r, winRate: winRateOf(r.id) }))
        .sort((a, b) => b.winRate - a.winRate),
    [roster, winRateOf],
  );

  const top10 = ranked.slice(0, 10);
  const bottom10 = [...ranked].reverse().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🦎 Dashboard</h1>
          <p className="text-sm text-foreground-muted">Salud general del roster y del metajuego, en tiempo real.</p>
        </div>
        <Badge tone={META_HEALTH_CONFIG[metaHealth].tone} className="px-3 py-1.5 text-sm">
          {META_HEALTH_CONFIG[metaHealth].label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon="🦎" label="Total de reptiles" value={roster.length} />
        <KpiCard icon="🧬" label="Afinidades" value={AFFINITIES.length} />
        <KpiCard icon="⚔️" label="Habilidades" value={ABILITIES.length} />
        <KpiCard icon="⚖️" label="Matchups" value={`${roster.length} × ${roster.length}`} />
        <KpiCard icon="📊" label="BST promedio" value={avgBst} />
        <KpiCard icon="🟢" label="Personajes saludables" value={stateCounts.aptos} accentClass="text-state-ok" />
        <KpiCard icon="🟡" label="A revisar" value={stateCounts.revisar} accentClass="text-state-warn" />
        <KpiCard icon="🔴" label="Riesgo alto" value={stateCounts.riesgoAlto} accentClass="text-state-danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por afinidad</CardTitle>
          </CardHeader>
          <CardContent>
            <AffinityDistributionChart roster={roster} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Promedio estadístico por afinidad</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsByAffinityChart roster={roster} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Radar promedio por afinidad</CardTitle>
        </CardHeader>
        <CardContent>
          <AffinityRadarChart roster={roster} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 · Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={top10} accentClass="text-state-ok" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bottom 10 · Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={bottom10} accentClass="text-state-danger" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de BST</CardTitle>
        </CardHeader>
        <CardContent>
          <BstHistogram roster={roster} />
        </CardContent>
      </Card>
    </div>
  );
}
