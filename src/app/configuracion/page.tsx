"use client";

import { useConfigStore } from "@/lib/store/config-store";
import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from "@/lib/game-engine/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const FIELDS: { key: keyof EngineConfig; label: string; hint: string; step?: string }[] = [
  { key: "ventaja", label: "Multiplicador de ventaja", hint: "Aplica cuando el atacante tiene ventaja de tipo", step: "0.01" },
  { key: "neutral", label: "Multiplicador neutral", hint: "Enfrentamientos sin relación de tipo directa", step: "0.01" },
  { key: "desventaja", label: "Multiplicador de desventaja", hint: "Aplica cuando el atacante tiene desventaja de tipo", step: "0.01" },
  { key: "stab", label: "STAB", hint: "Bonificación cuando la habilidad coincide con la afinidad propia", step: "0.01" },
  { key: "bstEstandar", label: "BST estándar", hint: "Suma total de estadísticas esperada para un personaje competitivo" },
  { key: "winRateDominante", label: "Win Rate dominante (%)", hint: "Umbral por encima del cual un personaje se marca DOMINANTE" },
  { key: "winRateDebil", label: "Win Rate débil (%)", hint: "Umbral por debajo del cual un personaje se marca DÉBIL" },
  { key: "offsetAtkDef", label: "Offset ATK/DEF", hint: "Constante sumada en (ATK + offset) / (DEF + offset)" },
  { key: "divisorDano", label: "Divisor de daño", hint: "Divisor final de la fórmula de daño base" },
];

export default function ConfiguracionPage() {
  const config = useConfigStore((s) => s.config);
  const setConfig = useConfigStore((s) => s.setConfig);
  const resetConfig = useConfigStore((s) => s.resetConfig);

  const isDefault = JSON.stringify(config) === JSON.stringify(DEFAULT_ENGINE_CONFIG);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚙️ Configuración del Motor</h1>
        <p className="text-sm text-foreground-muted">
          Estos valores alimentan todos los cálculos del sistema (daño, matchups, auditoría). Ningún archivo del motor
          usa números fijos: todo pasa por esta configuración.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros vigentes</CardTitle>
          {!isDefault && (
            <Button variant="outline" size="sm" onClick={resetConfig}>
              Restaurar valores por defecto
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <span>
                <span className="block text-sm font-medium text-foreground">{f.label}</span>
                <span className="block text-xs text-foreground-muted">{f.hint}</span>
              </span>
              <Input
                type="number"
                step={f.step ?? "1"}
                value={config[f.key]}
                onChange={(e) => setConfig({ [f.key]: Number(e.target.value) })}
                className="w-28 text-right"
              />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
