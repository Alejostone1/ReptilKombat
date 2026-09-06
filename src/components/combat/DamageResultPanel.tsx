import type { DamageResult } from "@/lib/game-engine/damage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function DamageResultPanel({ result, defensorNombre }: { result: DamageResult; defensorNombre: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado del cálculo</CardTitle>
        <div className="flex gap-2">
          <Badge tone="accent">×{result.multiplicadorAfinidad.toFixed(2)} afinidad</Badge>
          {result.stab > 1 && <Badge tone="ok">STAB ×{result.stab.toFixed(2)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-panel-secondary p-3">
            <p className="text-[11px] text-foreground-muted">Daño mínimo</p>
            <p className="text-xl font-bold text-foreground">{result.danoMinimo}</p>
          </div>
          <div className="rounded-lg border border-reptile-green/40 bg-reptile-green/10 p-3">
            <p className="text-[11px] text-foreground-muted">Daño esperado</p>
            <p className="text-xl font-bold text-reptile-green">{result.danoEsperado}</p>
          </div>
          <div className="rounded-lg bg-panel-secondary p-3">
            <p className="text-[11px] text-foreground-muted">Daño máximo</p>
            <p className="text-xl font-bold text-foreground">{result.danoMaximo}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-foreground-muted">
            <span>% de HP de {defensorNombre}</span>
            <span className="font-mono text-foreground">{result.porcentajeHP}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-panel-secondary">
            <div
              className="h-full rounded-full bg-affinity-termico"
              style={{ width: `${Math.min(100, result.porcentajeHP)}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-foreground-muted">
          Golpes estimados para derrotar:{" "}
          <span className="font-semibold text-foreground">
            {Number.isFinite(result.golpesParaDerrotar) ? result.golpesParaDerrotar : "∞"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
