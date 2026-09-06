"use client";

import { useMemo, useState } from "react";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { calculateDamage } from "@/lib/game-engine/damage";
import { ReptileSelector } from "@/components/reptiles/ReptileSelector";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DamageResultPanel } from "@/components/combat/DamageResultPanel";
import { STAT_LABELS } from "@/lib/game-engine/stat-labels";

export default function SimuladorPage() {
  const { config } = useEngineData();
  const { getReptilById, abilitiesByOwner } = useRoster();
  const [atacanteId, setAtacanteId] = useState<string | null>("dragon-barbudo");
  const [defensorId, setDefensorId] = useState<string | null>("caiman-negro");
  const [habilidadId, setHabilidadId] = useState<string>("");

  const atacante = atacanteId ? getReptilById(atacanteId) : null;
  const defensor = defensorId ? getReptilById(defensorId) : null;
  const habilidadesAtacante = useMemo(() => (atacante ? abilitiesByOwner(atacante.id) : []), [atacante, abilitiesByOwner]);
  const habilidad = habilidadesAtacante.find((h) => h.id === habilidadId) ?? habilidadesAtacante[0] ?? null;

  const resultado = atacante && defensor && habilidad ? calculateDamage(atacante, defensor, habilidad, config) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">💥 Simulador de Daño</h1>
        <p className="text-sm text-foreground-muted">Selecciona atacante, defensor y habilidad para calcular el daño exacto del motor.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-affinity-agil">Atacante</p>
          <ReptileSelector
            value={atacanteId}
            onChange={(id) => {
              setAtacanteId(id);
              setHabilidadId("");
            }}
            exclude={defensorId ?? undefined}
          />
          {atacante && (
            <div className="mt-3 space-y-1 text-sm">
              <AffinityBadge afinidad={atacante.afinidad} />
              <p className="text-foreground-muted">
                {STAT_LABELS.atk.emoji} Ataque <span className="font-mono text-foreground">{atacante.atk}</span>
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-affinity-termico">Defensor</p>
          <ReptileSelector value={defensorId} onChange={setDefensorId} exclude={atacanteId ?? undefined} />
          {defensor && (
            <div className="mt-3 space-y-1 text-sm">
              <AffinityBadge afinidad={defensor.afinidad} />
              <p className="text-foreground-muted">
                {STAT_LABELS.def.emoji} Defensa <span className="font-mono text-foreground">{defensor.def}</span> ·{" "}
                {STAT_LABELS.hp.emoji} Salud <span className="font-mono text-foreground">{defensor.hp}</span>
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-reptile-green">Habilidad</p>
          <Select value={habilidad?.id ?? ""} onChange={(e) => setHabilidadId(e.target.value)}>
            {habilidadesAtacante.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre} · Pot. {h.potencia}
              </option>
            ))}
          </Select>
          {habilidad && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="accent">{habilidad.categoria}</Badge>
              <Badge>Potencia {habilidad.potencia}</Badge>
              <Badge>Precisión {habilidad.precision}%</Badge>
            </div>
          )}
        </Card>
      </div>

      {atacante && defensor && habilidad && resultado && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del enfrentamiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground-muted">
              <p>
                <span className="font-semibold text-foreground">{atacante.nombre}</span> usa{" "}
                <span className="font-semibold text-foreground">{habilidad.nombre}</span> contra{" "}
                <span className="font-semibold text-foreground">{defensor.nombre}</span>.
              </p>
              <p>
                Afinidad {atacante.afinidad} → {defensor.afinidad}: multiplicador ×{resultado.multiplicadorAfinidad.toFixed(2)}
              </p>
              {resultado.stab > 1 && <p>La habilidad coincide con la afinidad del atacante: bonificación STAB aplicada.</p>}
            </CardContent>
          </Card>
          <DamageResultPanel result={resultado} defensorNombre={defensor.nombre} />
        </div>
      )}
    </div>
  );
}
