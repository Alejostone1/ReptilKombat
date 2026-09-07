"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Habilidad } from "@/types/ability";
import { useRosterStore } from "@/lib/store/roster-store";
import { AFFINITIES, type Afinidad } from "@/types/affinity";

export default function AdminHabilidadesPage() {
  return (
    <AdminGate>
      <HabilidadesAdmin />
    </AdminGate>
  );
}

const CATEGORIAS = ["Fisica", "Tecnica", "Control", "Estado"] as const;
const TIPOS_EFECTO = ["", "veneno", "debuff_atk", "debuff_def", "buff_atk", "buff_def", "buff_spd", "curacion"] as const;
const ETIQUETA_EFECTO: Record<string, string> = {
  "": "— Sin efecto —",
  veneno: "☠️ Veneno (daño por turno)",
  debuff_atk: "📉 Reduce ATK rival",
  debuff_def: "📉 Reduce DEF rival",
  buff_atk: "📈 Sube ATK propio",
  buff_def: "📈 Sube DEF propio",
  buff_spd: "📈 Sube SPD propio",
  curacion: "💚 Cura HP propio",
};

function HabilidadesAdmin() {
  const [habilidades, setHabilidades] = useState<Habilidad[]>([]);
  const [ediciones, setEdiciones] = useState<Record<string, Partial<Habilidad>>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [nuevaVisible, setNuevaVisible] = useState(false);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/admin/habilidades");
    const json = await res.json();
    setHabilidades(json.abilities ?? []);
    setEdiciones({});
    setLoading(false);
  }

  useEffect(() => {
    // Carga inicial: setLoading/setHabilidades ocurren tras el await, no de
    // forma síncrona — patrón estándar de fetch-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  function invalidarCacheRoster() {
    useRosterStore.getState().refetch();
  }

  function actualizarCampo(id: string, campo: keyof Habilidad, valor: string | number) {
    setEdiciones((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  }

  async function guardar(h: Habilidad) {
    const cambios = ediciones[h.id];
    if (!cambios) return;
    await fetch(`/api/admin/habilidades/${h.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    await cargar();
    invalidarCacheRoster();
  }

  async function eliminar(h: Habilidad) {
    if (!confirm(`¿Eliminar la habilidad "${h.nombre}"?`)) return;
    await fetch(`/api/admin/habilidades/${h.id}`, { method: "DELETE" });
    await cargar();
    invalidarCacheRoster();
  }

  const filtradas = habilidades.filter(
    (h) => !query || h.nombre.toLowerCase().includes(query.toLowerCase()) || h.propietarioId.includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-foreground-muted hover:text-reptile-green">
            ← Panel admin
          </Link>
          <h1 className="text-2xl font-bold text-foreground">⚔️ Habilidades ({habilidades.length})</h1>
        </div>
        <Button onClick={() => setNuevaVisible((v) => !v)}>{nuevaVisible ? "Cancelar" : "➕ Nueva habilidad"}</Button>
      </div>

      {nuevaVisible && (
        <NuevaHabilidadForm
          onCreada={() => {
            setNuevaVisible(false);
            cargar();
            invalidarCacheRoster();
          }}
        />
      )}

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o propietario..." className="max-w-xs" />

      <Card>
        <CardHeader>
          <CardTitle>{loading ? "Cargando..." : `${filtradas.length} habilidades`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Nombre</th>
                  <th className="px-2 py-2 text-left">Propietario</th>
                  <th className="px-2 py-2 text-left">Afinidad</th>
                  <th className="px-2 py-2 text-left">Categoría</th>
                  <th className="px-2 py-2 text-right">Potencia</th>
                  <th className="px-2 py-2 text-right">Precisión</th>
                  <th className="px-2 py-2 text-left">Efecto</th>
                  <th className="px-2 py-2 text-left">Efecto real</th>
                  <th className="px-2 py-2 text-right">Magnitud</th>
                  <th className="px-2 py-2 text-right">Turnos</th>
                  <th className="px-2 py-2 text-right">⚡ Energía</th>
                  <th className="px-2 py-2 text-right">⏱️ Cooldown</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((h) => {
                  const cambios = ediciones[h.id];
                  return (
                    <tr key={h.id} className="border-t border-border-subtle">
                      <td className="px-2 py-1.5 font-medium text-foreground">{h.nombre}</td>
                      <td className="px-2 py-1.5 text-xs text-foreground-muted">{h.propietarioId}</td>
                      <td className="px-2 py-1.5">
                        <AffinityBadge afinidad={h.afinidad as Afinidad} />
                      </td>
                      <td className="px-2 py-1.5 text-xs text-foreground-muted">{h.categoria}</td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.potencia}
                          onChange={(e) => actualizarCampo(h.id, "potencia", Number(e.target.value))}
                          className="w-20 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.precision}
                          onChange={(e) => actualizarCampo(h.id, "precision", Number(e.target.value))}
                          className="w-20 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          defaultValue={h.efecto}
                          onChange={(e) => actualizarCampo(h.id, "efecto", e.target.value)}
                          className="min-w-40"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          defaultValue={h.tipoEfecto ?? ""}
                          onChange={(e) => actualizarCampo(h.id, "tipoEfecto", e.target.value === "" ? (null as never) : e.target.value)}
                          className="min-w-44"
                        >
                          {TIPOS_EFECTO.map((t) => (
                            <option key={t} value={t}>
                              {ETIQUETA_EFECTO[t]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.efectoMagnitud ?? 0}
                          onChange={(e) => actualizarCampo(h.id, "efectoMagnitud", Number(e.target.value))}
                          className="w-16 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.efectoTurnos ?? 0}
                          onChange={(e) => actualizarCampo(h.id, "efectoTurnos", Number(e.target.value))}
                          className="w-14 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.costoEnergia}
                          onChange={(e) => actualizarCampo(h.id, "costoEnergia", Number(e.target.value))}
                          className="w-16 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          defaultValue={h.cooldownTurnos}
                          onChange={(e) => actualizarCampo(h.id, "cooldownTurnos", Number(e.target.value))}
                          className="w-14 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" disabled={!cambios} onClick={() => guardar(h)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" className="text-state-danger" onClick={() => eliminar(h)}>
                            Eliminar
                          </Button>
                        </div>
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

function NuevaHabilidadForm({ onCreada }: { onCreada: () => void }) {
  const [form, setForm] = useState({
    nombre: "",
    propietarioId: "",
    afinidad: AFFINITIES[0],
    categoria: CATEGORIAS[0],
    potencia: 50,
    precision: 90,
    efecto: "",
  });

  async function crear() {
    const res = await fetch("/api/admin/habilidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) onCreada();
  }

  return (
    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <Input
          placeholder="ID del reptil propietario (ej. dragon-barbudo)"
          value={form.propietarioId}
          onChange={(e) => setForm({ ...form, propietarioId: e.target.value })}
        />
        <Select value={form.afinidad} onChange={(e) => setForm({ ...form, afinidad: e.target.value as typeof form.afinidad })}>
          {AFFINITIES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as typeof form.categoria })}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          placeholder="Potencia"
          value={form.potencia}
          onChange={(e) => setForm({ ...form, potencia: Number(e.target.value) })}
        />
        <Input
          type="number"
          placeholder="Precisión"
          value={form.precision}
          onChange={(e) => setForm({ ...form, precision: Number(e.target.value) })}
        />
        <Input placeholder="Efecto" value={form.efecto} onChange={(e) => setForm({ ...form, efecto: e.target.value })} className="sm:col-span-2" />
      </div>
      <Button className="mt-3" onClick={crear}>
        Crear habilidad
      </Button>
    </Card>
  );
}
