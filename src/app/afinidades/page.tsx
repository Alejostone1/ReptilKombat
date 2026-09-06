"use client";

import { useMemo } from "react";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { auditAffinityMatrix } from "@/lib/game-engine/affinities";
import { AffinityMatrixGrid } from "@/components/affinities/AffinityMatrixGrid";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function AfinidadesPage() {
  const { config } = useEngineData();
  const audits = useMemo(() => auditAffinityMatrix(), []);
  const hayAlerta = audits.some((a) => a.estado === "ALERTA");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚖️ Matriz de Afinidades</h1>
        <p className="text-sm text-foreground-muted">
          Regla cerrada: cada afinidad tiene exactamente 2 ventajas (×{config.ventaja}), 2 desventajas (×{config.desventaja}) y 4
          neutrales (×{config.neutral}), incluyendo el espejo. Pasa el mouse sobre una celda para ver el detalle.
        </p>
      </div>

      {hayAlerta && (
        <Card className="border-state-danger/50 bg-state-danger/10 p-4">
          <p className="font-semibold text-state-danger">🚨 ALERTA DE BALANCE</p>
          <p className="text-sm text-foreground-muted">La matriz ha perdido su equilibrio cerrado. Revisa las afinidades marcadas abajo.</p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="pt-4">
          <AffinityMatrixGrid config={config} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría automática de la matriz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Afinidad</th>
                  <th className="px-3 py-2 text-left">Ventajas</th>
                  <th className="px-3 py-2 text-left">Debilidades</th>
                  <th className="px-3 py-2 text-left">Neutrales</th>
                  <th className="px-3 py-2 text-right">Índice de dominancia</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.afinidad} className="border-t border-border-subtle">
                    <td className="px-3 py-2">
                      <AffinityBadge afinidad={a.afinidad} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.ventajas.map((v) => (
                          <AffinityBadge key={v} afinidad={v} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.debilidades.map((v) => (
                          <AffinityBadge key={v} afinidad={v} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground-muted">{a.neutrales.join(", ")}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{a.indiceDominancia}</td>
                    <td className="px-3 py-2">
                      <Badge tone={a.estado === "OK" ? "ok" : "danger"}>{a.estado === "OK" ? "✅ OK" : "🚨 ALERTA"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
