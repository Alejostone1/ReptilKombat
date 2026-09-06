"use client";

import { useMemo, useState } from "react";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { AFFINITIES } from "@/types/affinity";
import { Input, Select } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { ReptileTable } from "@/components/reptiles/ReptileTable";
import { ReptileCard } from "@/components/reptiles/ReptileCard";

export default function RosterPage() {
  const { roster, auditByReptilId } = useEngineData();
  const [query, setQuery] = useState("");
  const [afinidad, setAfinidad] = useState("");
  const [familia, setFamilia] = useState("");
  const [rol, setRol] = useState("");
  const [view, setView] = useState<"tabla" | "tarjetas">("tabla");

  const familias = useMemo(() => Array.from(new Set(roster.map((r) => r.familia))).sort(), [roster]);
  const roles = useMemo(() => Array.from(new Set(roster.map((r) => r.rolTactico))).sort(), [roster]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((r) => {
      const matchesQuery =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        r.nombreCientifico.toLowerCase().includes(q) ||
        r.familia.toLowerCase().includes(q) ||
        r.afinidad.toLowerCase().includes(q) ||
        r.rolTactico.toLowerCase().includes(q);
      return matchesQuery && (!afinidad || r.afinidad === afinidad) && (!familia || r.familia === familia) && (!rol || r.rolTactico === rol);
    });
  }, [roster, query, afinidad, familia, rol]);

  const withEstado = filtered.map((r) => ({ ...r, estado: auditByReptilId.get(r.id)?.estado ?? "APTO" }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">📋 Roster</h1>
        <p className="text-sm text-foreground-muted">
          {filtered.length} de {roster.length} reptiles · busca por nombre, científico, familia, afinidad o rol.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar reptil..."
          className="max-w-xs"
        />
        <Select value={afinidad} onChange={(e) => setAfinidad(e.target.value)} className="max-w-[10rem]">
          <option value="">Toda afinidad</option>
          {AFFINITIES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={familia} onChange={(e) => setFamilia(e.target.value)} className="max-w-[12rem]">
          <option value="">Toda familia</option>
          {familias.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Select value={rol} onChange={(e) => setRol(e.target.value)} className="max-w-[12rem]">
          <option value="">Todo rol</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <div className="ml-auto">
          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: "tabla", label: "Tabla" },
              { value: "tarjetas", label: "Tarjetas" },
            ]}
          />
        </div>
      </div>

      {view === "tabla" ? (
        <ReptileTable data={withEstado} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {withEstado.map((r) => (
            <ReptileCard key={r.id} reptil={r} estado={r.estado} />
          ))}
        </div>
      )}
    </div>
  );
}
