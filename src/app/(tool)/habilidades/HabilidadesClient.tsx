"use client";

import { useMemo, useState } from "react";
import { useRoster } from "@/lib/hooks/useRoster";
import { AFFINITIES } from "@/types/affinity";
import { Input, Select } from "@/components/ui/Input";
import { AbilityCard } from "@/components/abilities/AbilityCard";

const CATEGORIAS = ["Fisica", "Tecnica", "Control", "Estado"] as const;
type SortKey = "nombre" | "potencia" | "precision";

export function HabilidadesClient({ initialQuery = "" }: { initialQuery?: string }) {
  const { abilities: ABILITIES, getReptilById } = useRoster();
  const [query, setQuery] = useState(initialQuery);
  const [afinidad, setAfinidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sort, setSort] = useState<SortKey>("potencia");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ABILITIES.filter((a) => {
      const owner = getReptilById(a.propietarioId);
      const matchesQuery =
        !q || a.nombre.toLowerCase().includes(q) || owner?.nombre.toLowerCase().includes(q) || a.efecto.toLowerCase().includes(q);
      return matchesQuery && (!afinidad || a.afinidad === afinidad) && (!categoria || a.categoria === categoria);
    }).sort((x, y) => {
      if (sort === "nombre") return x.nombre.localeCompare(y.nombre);
      return y[sort] - x[sort];
    });
  }, [query, afinidad, categoria, sort, ABILITIES, getReptilById]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚔️ Habilidades</h1>
        <p className="text-sm text-foreground-muted">
          {filtered.length} de {ABILITIES.length} habilidades · 4 por personaje.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar habilidad o personaje..." className="max-w-xs" />
        <Select value={afinidad} onChange={(e) => setAfinidad(e.target.value)} className="max-w-[10rem]">
          <option value="">Toda afinidad</option>
          {AFFINITIES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="max-w-[10rem]">
          <option value="">Toda categoría</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="max-w-[10rem]">
          <option value="potencia">Ordenar: Potencia</option>
          <option value="precision">Ordenar: Precisión</option>
          <option value="nombre">Ordenar: Nombre</option>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((h) => (
          <AbilityCard key={h.id} habilidad={h} ownerName={getReptilById(h.propietarioId)?.nombre} />
        ))}
      </div>
    </div>
  );
}
