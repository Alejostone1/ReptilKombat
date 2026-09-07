"use client";

import { useMemo, useState } from "react";
import type { Reptil } from "@/types/reptile";
import { GameCard } from "./GameCard";
import { Input, Select } from "@/components/ui/Input";
import { AFFINITIES } from "@/types/affinity";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { cn } from "@/lib/utils";

interface DeckBuilderProps {
  titulo: string;
  roster: Reptil[];
  seleccionados: string[];
  bloqueados: string[];
  onToggle: (reptilId: string) => void;
  accentClass?: string;
}

export function DeckBuilder({ titulo, roster, seleccionados, bloqueados, onToggle, accentClass = "text-reptile-green" }: DeckBuilderProps) {
  const [query, setQuery] = useState("");
  const [afinidad, setAfinidad] = useState("");
  const [rol, setRol] = useState("");

  const roles = useMemo(() => Array.from(new Set(roster.map((r) => r.rolTactico))).sort(), [roster]);

  const filtrados = roster.filter((r) => {
    const q = query.trim().toLowerCase();
    const coincideQuery = !q || r.nombre.toLowerCase().includes(q) || r.nombreCientifico.toLowerCase().includes(q);
    return coincideQuery && (!afinidad || r.afinidad === afinidad) && (!rol || r.rolTactico === rol);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-bold uppercase tracking-wide", accentClass)}>{titulo}</h3>
        <span className="text-xs text-foreground-muted">
          {seleccionados.length}/{MAX_CARTAS_MAZO} cartas
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar reptil..." className="sm:flex-1" />
        <Select value={afinidad} onChange={(e) => setAfinidad(e.target.value)} className="sm:w-40">
          <option value="">Toda afinidad</option>
          {AFFINITIES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={rol} onChange={(e) => setRol(e.target.value)} className="sm:w-44">
          <option value="">Todo rol</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-[11px] text-foreground-muted">
        {filtrados.length} de {roster.length} reptiles
      </p>

      <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
        {filtrados.length === 0 && <p className="col-span-full py-6 text-center text-xs text-foreground-muted">Sin resultados.</p>}
        {filtrados.map((r) => {
          const seleccionada = seleccionados.includes(r.id);
          const bloqueadaPorRival = bloqueados.includes(r.id) && !seleccionada;
          const limiteAlcanzado = seleccionados.length >= MAX_CARTAS_MAZO && !seleccionada;
          return (
            <GameCard
              key={r.id}
              reptil={r}
              size="sm"
              seleccionable
              seleccionada={seleccionada}
              deshabilitada={bloqueadaPorRival || limiteAlcanzado}
              onClick={() => onToggle(r.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
