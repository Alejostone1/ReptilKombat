"use client";

import { useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useReptilById, useRoster } from "@/lib/hooks/useRoster";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { ReptileGallery } from "@/components/reptiles/ReptileGallery";
import { StatBar } from "@/components/reptiles/StatBar";
import { StatRadar } from "@/components/charts/StatRadar";
import { AbilityCard } from "@/components/abilities/AbilityCard";
import { BalanceStatusBadge } from "@/components/ui/BalanceStatusBadge";
import { WinRateBadge } from "@/components/ui/WinRateBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import { AFFINITIES } from "@/types/affinity";
import { STAT_LABELS, STAT_ORDER } from "@/lib/game-engine/stat-labels";

export default function ReptilPerfilPage() {
  const params = useParams<{ id: string }>();
  const { reptil, loading } = useReptilById(params.id);
  const { abilitiesByOwner } = useRoster();
  const { roster, config, auditByReptilId, bestMatchupOf, worstMatchupOf, winRateOf } = useEngineData();

  const habilidades = useMemo(() => (reptil ? abilitiesByOwner(reptil.id) : []), [reptil, abilitiesByOwner]);

  if (loading) return <PerfilSkeleton />;
  if (!reptil) return notFound();

  const audit = auditByReptilId.get(reptil.id);
  const winRate = winRateOf(reptil.id);
  const mejor = bestMatchupOf(reptil.id);
  const peor = worstMatchupOf(reptil.id);
  const mejorReptil = mejor ? roster.find((r) => r.id === mejor.reptilId) : null;
  const peorReptil = peor ? roster.find((r) => r.id === peor.reptilId) : null;

  const ventajas = AFFINITIES.filter((a) => getAffinityTier(reptil.afinidad, a) === "ventaja");
  const debilidades = AFFINITIES.filter((a) => getAffinityTier(reptil.afinidad, a) === "desventaja");

  const radarData = STAT_ORDER.map((key) => ({ label: STAT_LABELS[key].corto, a: reptil[key] }));

  return (
    <div className="space-y-6">
      <Link href="/roster" className="text-sm text-foreground-muted hover:text-reptile-green">
        ← Volver al roster
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <ReptileGallery nombre={reptil.nombre} nombreCientifico={reptil.nombreCientifico} />
          <div className="flex flex-wrap gap-2">
            <AffinityBadge afinidad={reptil.afinidad} size="md" />
            {audit && <BalanceStatusBadge estado={audit.estado} />}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{reptil.nombre}</h1>
            <p className="italic text-foreground-muted">{reptil.nombreCientifico}</p>
            <p className="mt-2 text-sm text-foreground-muted">{reptil.descripcion}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <InfoField label="Familia" value={reptil.familia} />
            <InfoField label="Género" value={reptil.genero ?? "—"} />
            <InfoField label="Rol táctico" value={reptil.rolTactico} />
            <InfoField label="BST" value={String(reptil.bst)} />
            <InfoField label="Hábitat" value={reptil.habitat} span />
            <InfoField label="Distribución" value={reptil.distribucion} span />
          </div>

          {reptil.pasiva && (
            <Card className="border-reptile-green/30 bg-reptile-green/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-reptile-green">Pasiva</p>
              <p className="text-sm text-foreground">{reptil.pasiva}</p>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatBar statKey="hp" value={reptil.hp} colorClass="bg-state-ok" />
            <StatBar statKey="atk" value={reptil.atk} colorClass="bg-affinity-termico" />
            <StatBar statKey="def" value={reptil.def} colorClass="bg-affinity-acorazado" />
            <StatBar statKey="spd" value={reptil.spd} colorClass="bg-affinity-agil" />
            <StatBar statKey="inst" value={reptil.inst} colorClass="bg-affinity-sensorial" />
            <StatBar statKey="adp" value={reptil.adp} colorClass="bg-affinity-venenoso" />
            <div className="grid grid-cols-3 gap-2 pt-3 text-center">
              <IndexBadge label="Ofensivo" value={reptil.indiceOfensivo} />
              <IndexBadge label="Defensivo" value={reptil.indiceDefensivo} />
              <IndexBadge label="Movilidad" value={reptil.indiceMovilidad} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perfil visual</CardTitle>
          </CardHeader>
          <CardContent>
            <StatRadar data={radarData} nameA={reptil.nombre} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fortalezas y debilidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs text-foreground-muted">Ventaja de tipo contra</p>
              <div className="flex flex-wrap gap-1.5">
                {ventajas.map((a) => (
                  <AffinityBadge key={a} afinidad={a} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-foreground-muted">Desventaja de tipo contra</p>
              <div className="flex flex-wrap gap-1.5">
                {debilidades.map((a) => (
                  <AffinityBadge key={a} afinidad={a} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Análisis competitivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-foreground-muted">Win Rate</span>
              <WinRateBadge winRate={winRate} config={config} />
            </div>
            {mejorReptil && (
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Mejor matchup</span>
                <Link href={`/reptiles/${mejorReptil.id}`} className="font-medium text-state-ok hover:underline">
                  {mejorReptil.nombre} ({mejor!.probabilidad.toFixed(0)}%)
                </Link>
              </div>
            )}
            {peorReptil && (
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Peor matchup</span>
                <Link href={`/reptiles/${peorReptil.id}`} className="font-medium text-state-danger hover:underline">
                  {peorReptil.nombre} ({peor!.probabilidad.toFixed(0)}%)
                </Link>
              </div>
            )}
            {audit && audit.alertas.length > 0 && (
              <div className="space-y-1 pt-2">
                {audit.alertas.map((a) => (
                  <Badge key={a} tone="warn" className="mr-1.5">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Habilidades</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {habilidades.map((h) => (
            <AbilityCard key={h.id} habilidad={h} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <p className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function IndexBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-panel-secondary p-2">
      <p className="text-[10px] text-foreground-muted">{label}</p>
      <p className="font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PerfilSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="aspect-square animate-pulse rounded-xl bg-panel-secondary" />
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded bg-panel-secondary" />
        <div className="h-4 w-40 animate-pulse rounded bg-panel-secondary" />
        <div className="h-24 w-full animate-pulse rounded bg-panel-secondary" />
      </div>
    </div>
  );
}
