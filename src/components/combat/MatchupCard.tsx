import type { Reptil } from "@/types/reptile";
import type { MatchupResult, MatchupLabel } from "@/lib/game-engine/matchups";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface MatchupCardProps {
  a: Reptil;
  b: Reptil;
  matchup: MatchupResult;
  label: MatchupLabel;
}

export function MatchupCard({ a, b, matchup, label }: MatchupCardProps) {
  const ganadorA = matchup.probabilidadAtacante >= matchup.probabilidadDefensor;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de combate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm font-semibold text-foreground">{a.nombre}</p>
            <AffinityBadge afinidad={a.afinidad} />
            <p className="mt-2 text-3xl font-bold text-reptile-green">{matchup.probabilidadAtacante.toFixed(0)}%</p>
            <p className="text-[11px] text-foreground-muted">×{matchup.multiplicadorAtacante.toFixed(2)} afinidad</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{b.nombre}</p>
            <AffinityBadge afinidad={b.afinidad} />
            <p className="mt-2 text-3xl font-bold text-affinity-termico">{matchup.probabilidadDefensor.toFixed(0)}%</p>
            <p className="text-[11px] text-foreground-muted">×{matchup.multiplicadorDefensor.toFixed(2)} afinidad</p>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-panel-secondary">
          <div className="flex h-full w-full">
            <div className="h-full bg-reptile-green" style={{ width: `${matchup.probabilidadAtacante}%` }} />
            <div className="h-full bg-affinity-termico" style={{ width: `${matchup.probabilidadDefensor}%` }} />
          </div>
        </div>

        <p className="text-center text-sm font-semibold tracking-wide text-foreground">
          {label === "EQUILIBRADO" ? "⚪ ENFRENTAMIENTO EQUILIBRADO" : `${ganadorA ? "🟢" : "🟠"} ${label} PARA ${ganadorA ? a.nombre : b.nombre}`}
        </p>
      </CardContent>
    </Card>
  );
}
