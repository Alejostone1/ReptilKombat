"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AFFINITIES } from "@/types/affinity";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { calculateBST, calculateDefensiveIndex, calculateMobilityIndex, calculateOffensiveIndex, statMax, statMin } from "@/lib/game-engine/stats";
import { STAT_THRESHOLDS } from "@/lib/game-engine/config";
import { STAT_LABELS, STAT_ORDER } from "@/lib/game-engine/stat-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { slugify } from "@/lib/utils";

const schema = z.object({
  nombre: z.string().min(2, "Requerido"),
  nombreCientifico: z.string().min(2, "Requerido"),
  familia: z.string().min(2, "Requerido"),
  genero: z.string().optional(),
  afinidad: z.enum(AFFINITIES),
  rolTactico: z.string().min(2, "Requerido"),
  habitat: z.string().min(2, "Requerido"),
  distribucion: z.string().min(2, "Requerido"),
  descripcion: z.string().min(10, "Describe al menos en una frase"),
  pasiva: z.string().optional(),
  hp: z.coerce.number().min(1).max(150),
  atk: z.coerce.number().min(1).max(150),
  def: z.coerce.number().min(1).max(150),
  spd: z.coerce.number().min(1).max(150),
  inst: z.coerce.number().min(1).max(150),
  adp: z.coerce.number().min(1).max(150),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  nombre: "",
  nombreCientifico: "",
  familia: "",
  genero: "",
  afinidad: "Térmico",
  rolTactico: "",
  habitat: "",
  distribucion: "",
  descripcion: "",
  pasiva: "",
  hp: 60,
  atk: 60,
  def: 60,
  spd: 60,
  inst: 60,
  adp: 60,
};

export default function NuevoPersonajePage() {
  const { config } = useEngineData();
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const values = watch();

  const bst = useMemo(() => calculateBST(values), [values]);
  const iOf = useMemo(() => calculateOffensiveIndex(values), [values]);
  const iDef = useMemo(() => calculateDefensiveIndex(values), [values]);
  const iMov = useMemo(() => calculateMobilityIndex(values), [values]);
  const max = useMemo(() => statMax(values), [values]);
  const min = useMemo(() => statMin(values), [values]);

  const bstOk = bst === config.bstEstandar;
  const picoAlerta = max > STAT_THRESHOLDS.picoAlerta;
  const sacrificioAlerta = min < STAT_THRESHOLDS.sacrificioAlerta;
  const powerCreep = bst > config.bstEstandar + 15 || picoAlerta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">➕ Nuevo Personaje</h1>
        <p className="text-sm text-foreground-muted">El sistema audita el diseño en tiempo real para evitar power creep.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Ficha del personaje</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmit((data) => setSubmitted(data))}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" error={errors.nombre?.message}>
                  <Input {...register("nombre")} placeholder="Ej. Lagarto de Fuego" />
                </Field>
                <Field label="Nombre científico" error={errors.nombreCientifico?.message}>
                  <Input {...register("nombreCientifico")} placeholder="Ej. Genus speciesus" />
                </Field>
                <Field label="Familia" error={errors.familia?.message}>
                  <Input {...register("familia")} placeholder="Ej. Agamidae" />
                </Field>
                <Field label="Género">
                  <Input {...register("genero")} placeholder="Ej. Pogona" />
                </Field>
                <Field label="Afinidad">
                  <Select {...register("afinidad")}>
                    {AFFINITIES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Rol táctico" error={errors.rolTactico?.message}>
                  <Input {...register("rolTactico")} placeholder="Ej. Bruiser térmico" />
                </Field>
                <Field label="Hábitat" error={errors.habitat?.message}>
                  <Input {...register("habitat")} placeholder="Ej. Desiertos áridos" />
                </Field>
                <Field label="Distribución" error={errors.distribucion?.message}>
                  <Input {...register("distribucion")} placeholder="Ej. Norte de África" />
                </Field>
              </div>

              <Field label="Descripción" error={errors.descripcion?.message}>
                <textarea
                  {...register("descripcion")}
                  rows={3}
                  className="w-full rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-reptile-green/60"
                />
              </Field>
              <Field label="Pasiva (opcional)">
                <Input {...register("pasiva")} placeholder="Ej. Regeneración térmica al iniciar combate" />
              </Field>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {STAT_ORDER.map((key) => (
                  <Field key={key} label={`${STAT_LABELS[key].emoji} ${STAT_LABELS[key].largo}`}>
                    <Input type="number" {...register(key, { valueAsNumber: true })} />
                  </Field>
                ))}
              </div>

              <Button type="submit">Registrar personaje</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auditoría en vivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="BST" value={bst}>
                <Badge tone={bstOk ? "ok" : "warn"}>{bstOk ? "🟢 BST correcto" : `🟡 Esperado ${config.bstEstandar}`}</Badge>
              </Row>
              <Row label="Índice ofensivo" value={iOf} />
              <Row label="Índice defensivo" value={iDef} />
              <Row label="Índice movilidad" value={iMov} />
              <Row label="Stat máxima" value={max}>
                {picoAlerta && <Badge tone="danger">🔴 Alerta de pico</Badge>}
              </Row>
              <Row label="Stat mínima" value={min}>
                {sacrificioAlerta && <Badge tone="warn">🟡 Sacrificio extremo</Badge>}
              </Row>
              <div className="pt-2">
                <Badge tone={powerCreep ? "danger" : bstOk ? "ok" : "warn"} className="w-full justify-center py-1.5">
                  {powerCreep ? "🔴 Riesgo de power creep" : bstOk ? "🟢 Diseño balanceado" : "🟡 Estadística fuera de estándar"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {submitted && (
            <Card className="border-reptile-green/40 bg-reptile-green/5">
              <CardHeader>
                <CardTitle>Registrado ✅</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-foreground-muted">
                <p>
                  ID sugerido: <span className="font-mono text-foreground">{slugify(submitted.nombre)}</span>
                </p>
                <p>Copia este registro a <code>src/data/reptiles.ts</code> y sus habilidades a <code>src/data/abilities.ts</code> para incorporarlo permanentemente al roster.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-foreground-muted">{label}</span>
      {children}
      {error && <span className="block text-[11px] text-state-danger">{error}</span>}
    </label>
  );
}

function Row({ label, value, children }: { label: string; value: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-foreground">{value}</span>
        {children}
      </span>
    </div>
  );
}
