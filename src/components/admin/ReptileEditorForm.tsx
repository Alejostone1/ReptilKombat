"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AFFINITIES } from "@/types/affinity";
import { calculateBST, calculateDefensiveIndex, calculateMobilityIndex, calculateOffensiveIndex, statMax, statMin } from "@/lib/game-engine/stats";
import { STAT_THRESHOLDS, DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { STAT_LABELS, STAT_ORDER } from "@/lib/game-engine/stat-labels";
import { reptileInputSchema, type ReptileInput } from "@/lib/validation/reptile-schema";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface ReptileEditorFormProps {
  initial?: Partial<ReptileInput>;
  onSubmit: (data: ReptileInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

const DEFAULTS: ReptileInput = {
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
  energiaMax: 100,
  criticoProbabilidad: 10,
  imagenUrl: "",
};

export function ReptileEditorForm({ initial, onSubmit, onCancel, submitLabel }: ReptileEditorFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReptileInput>({ resolver: zodResolver(reptileInputSchema), defaultValues: { ...DEFAULTS, ...initial } });

  const values = watch();
  const imagenActual = values.imagenUrl;
  const bst = useMemo(() => calculateBST(values), [values]);
  const iOf = useMemo(() => calculateOffensiveIndex(values), [values]);
  const iDef = useMemo(() => calculateDefensiveIndex(values), [values]);
  const iMov = useMemo(() => calculateMobilityIndex(values), [values]);
  const max = useMemo(() => statMax(values), [values]);
  const min = useMemo(() => statMin(values), [values]);
  const bstOk = bst === DEFAULT_ENGINE_CONFIG.bstEstandar;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <Card>
        <CardHeader>
          <CardTitle>Ficha del reptil</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((data) => onSubmit({ ...data, imagenUrl: data.imagenUrl?.trim() ? data.imagenUrl.trim() : null }))}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre" error={errors.nombre?.message}>
                <Input {...register("nombre")} />
              </Field>
              <Field label="Nombre científico" error={errors.nombreCientifico?.message}>
                <Input {...register("nombreCientifico")} />
              </Field>
              <Field label="Familia" error={errors.familia?.message}>
                <Input {...register("familia")} />
              </Field>
              <Field label="Género">
                <Input {...register("genero")} />
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
                <Input {...register("rolTactico")} />
              </Field>
              <Field label="Hábitat" error={errors.habitat?.message}>
                <Input {...register("habitat")} />
              </Field>
              <Field label="Distribución" error={errors.distribucion?.message}>
                <Input {...register("distribucion")} />
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
              <Input {...register("pasiva")} />
            </Field>

            <Field label="Imagen">
              <div className="flex items-center gap-3">
                {imagenActual ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview simple en admin, no forma parte del pipeline de imágenes optimizadas del sitio.
                  <img src={imagenActual} alt="Preview" className="h-16 w-16 rounded-lg border border-border-subtle object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border-subtle text-xs text-foreground-muted">
                    Auto
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <Input {...register("imagenUrl")} placeholder="URL de imagen (vacío = automática por especie)" />
                  {imagenActual && (
                    <button
                      type="button"
                      onClick={() => setValue("imagenUrl", "")}
                      className="text-[11px] text-foreground-muted underline decoration-dotted hover:text-foreground"
                    >
                      Restaurar imagen automática
                    </button>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {STAT_ORDER.map((key) => (
                <Field key={key} label={`${STAT_LABELS[key].emoji} ${STAT_LABELS[key].largo}`}>
                  <Input type="number" {...register(key, { valueAsNumber: true })} />
                </Field>
              ))}
              <Field label="⚡ Energía máx." error={errors.energiaMax?.message}>
                <Input type="number" {...register("energiaMax", { valueAsNumber: true })} />
              </Field>
              <Field label="🎯 Crítico (%)" error={errors.criticoProbabilidad?.message}>
                <Input type="number" {...register("criticoProbabilidad", { valueAsNumber: true })} />
              </Field>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Auditoría en vivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="BST" value={bst}>
            <Badge tone={bstOk ? "ok" : "warn"}>{bstOk ? "🟢 Correcto" : `🟡 Esperado ${DEFAULT_ENGINE_CONFIG.bstEstandar}`}</Badge>
          </Row>
          <Row label="Índice ofensivo" value={iOf} />
          <Row label="Índice defensivo" value={iDef} />
          <Row label="Índice movilidad" value={iMov} />
          <Row label="Stat máxima" value={max}>
            {max > STAT_THRESHOLDS.picoAlerta && <Badge tone="danger">🔴 Pico</Badge>}
          </Row>
          <Row label="Stat mínima" value={min}>
            {min < STAT_THRESHOLDS.sacrificioAlerta && <Badge tone="warn">🟡 Sacrificio</Badge>}
          </Row>
        </CardContent>
      </Card>
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
