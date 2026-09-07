"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { ReptileEditorForm } from "@/components/admin/ReptileEditorForm";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ReptileInput } from "@/lib/validation/reptile-schema";
import type { ReptilBase } from "@/types/reptile";
import { useRosterStore } from "@/lib/store/roster-store";
import { calculateBST } from "@/lib/game-engine/stats";

export default function AdminReptilesPage() {
  return (
    <AdminGate>
      <ReptilesAdmin />
    </AdminGate>
  );
}

function reptilToInput(r: ReptilBase): ReptileInput {
  return {
    nombre: r.nombre,
    nombreCientifico: r.nombreCientifico,
    familia: r.familia,
    genero: r.genero ?? "",
    afinidad: r.afinidad,
    rolTactico: r.rolTactico,
    habitat: r.habitat,
    distribucion: r.distribucion,
    descripcion: r.descripcion,
    pasiva: r.pasiva ?? "",
    hp: r.hp,
    atk: r.atk,
    def: r.def,
    spd: r.spd,
    inst: r.inst,
    adp: r.adp,
    energiaMax: r.energiaMax,
    criticoProbabilidad: r.criticoProbabilidad,
    imagenUrl: r.imagenUrl ?? "",
  };
}

function ReptilesAdmin() {
  const [reptiles, setReptiles] = useState<ReptilBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<"lista" | "crear" | "editar">("lista");
  const [editando, setEditando] = useState<ReptilBase | null>(null);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/admin/reptiles");
    const json = await res.json();
    setReptiles(json.reptiles ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // Carga inicial de la lista: setLoading/setReptiles ocurren tras el await,
    // no de forma síncrona — patrón estándar de fetch-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  function invalidarCacheRoster() {
    // Fuerza que useRoster() vuelva a leer de Supabase en el resto de la app.
    useRosterStore.getState().refetch();
  }

  async function crear(data: ReptileInput) {
    const res = await fetch("/api/admin/reptiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await cargar();
      invalidarCacheRoster();
      setModo("lista");
    }
  }

  async function guardarEdicion(data: ReptileInput) {
    if (!editando) return;
    const res = await fetch(`/api/admin/reptiles/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await cargar();
      invalidarCacheRoster();
      setModo("lista");
      setEditando(null);
    }
  }

  async function toggleActivo(r: ReptilBase) {
    if (r.activo) {
      const ok = confirm(`¿Desactivar a ${r.nombre}? Dejará de aparecer en nuevas partidas (las partidas ya en curso no se ven afectadas).`);
      if (!ok) return;
    }
    await fetch(`/api/admin/reptiles/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !r.activo }),
    });
    await cargar();
    invalidarCacheRoster();
  }

  async function eliminar(r: ReptilBase) {
    if (!confirm(`¿Eliminar a ${r.nombre} definitivamente? Esto también borra sus habilidades.`)) return;
    await fetch(`/api/admin/reptiles/${r.id}`, { method: "DELETE" });
    await cargar();
    invalidarCacheRoster();
  }

  if (modo === "crear") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">➕ Nuevo reptil</h1>
        <ReptileEditorForm onSubmit={crear} onCancel={() => setModo("lista")} submitLabel="Crear reptil" />
      </div>
    );
  }

  if (modo === "editar" && editando) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">✏️ Editar {editando.nombre}</h1>
        <ReptileEditorForm
          initial={reptilToInput(editando)}
          onSubmit={guardarEdicion}
          onCancel={() => {
            setModo("lista");
            setEditando(null);
          }}
          submitLabel="Guardar cambios"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-foreground-muted hover:text-reptile-green">
            ← Panel admin
          </Link>
          <h1 className="text-2xl font-bold text-foreground">🦎 Reptiles ({reptiles.length})</h1>
        </div>
        <Button onClick={() => setModo("crear")}>➕ Nuevo reptil</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{loading ? "Cargando..." : `${reptiles.length} reptiles`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Afinidad</th>
                  <th className="px-3 py-2 text-right">BST</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reptiles.map((r) => (
                  <tr key={r.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2 font-medium text-foreground">{r.nombre}</td>
                    <td className="px-3 py-2">
                      <AffinityBadge afinidad={r.afinidad} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{calculateBST(r)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={r.activo ? "ok" : "danger"}>{r.activo ? "Activo" : "Desactivado"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditando(r);
                            setModo("editar");
                          }}
                        >
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => toggleActivo(r)}>
                          {r.activo ? "Desactivar" : "Activar"}
                        </Button>
                        <Button size="sm" variant="outline" className="text-state-danger" onClick={() => eliminar(r)}>
                          Eliminar
                        </Button>
                      </div>
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
