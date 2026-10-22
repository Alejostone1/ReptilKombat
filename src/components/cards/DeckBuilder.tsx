"use client";

import { useMemo, useState } from "react";
import type { Reptil } from "@/types/reptile";
import { CardPickerTile } from "./CardPickerTile";
import { CardInfoSheet } from "./CardInfoSheet";
import { maximosDelRoster } from "@/lib/game-engine/stat-compare";
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
  /** Cartas máximas del mazo (1 vs 1 = 4; 2 vs 2 = 2). */
  maxCartas?: number;
}

export function DeckBuilder({ titulo, roster, seleccionados, bloqueados, onToggle, accentClass = "text-reptile-green", maxCartas = MAX_CARTAS_MAZO }: DeckBuilderProps) {
  const [query, setQuery] = useState("");
  const [afinidad, setAfinidad] = useState("");
  const [rol, setRol] = useState("");
  const [detalle, setDetalle] = useState<Reptil | null>(null);

  const roles = useMemo(() => Array.from(new Set(roster.map((r) => r.rolTactico))).sort(), [roster]);
  const maximos = useMemo(() => maximosDelRoster(roster), [roster]);

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
          {seleccionados.length}/{maxCartas} cartas
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
        {filtrados.length} de {roster.length} reptiles · toca para elegir, ℹ️ o mantén presionado para ver detalle
      </p>

      <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto sm:max-h-[520px] sm:grid-cols-3">
        {filtrados.length === 0 && <p className="col-span-full py-6 text-center text-xs text-foreground-muted">Sin resultados.</p>}
        {filtrados.map((r) => {
          const seleccionada = seleccionados.includes(r.id);
          const bloqueadaPorRival = bloqueados.includes(r.id) && !seleccionada;
          const limiteAlcanzado = seleccionados.length >= maxCartas && !seleccionada;
          return (
            <CardPickerTile
              key={r.id}
              reptil={r}
              maximos={maximos}
              seleccionada={seleccionada}
              deshabilitada={bloqueadaPorRival || limiteAlcanzado}
              onToggle={() => onToggle(r.id)}
              onVerDetalle={() => setDetalle(r)}
            />
          );
        })}
      </div>

      <CardInfoSheet reptil={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
