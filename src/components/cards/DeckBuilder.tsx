"use client";

import { useState } from "react";
import type { Reptil } from "@/types/reptile";
import { GameCard } from "./GameCard";
import { Input } from "@/components/ui/Input";
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
  const filtrados = roster.filter((r) => !query || r.nombre.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-bold uppercase tracking-wide", accentClass)}>{titulo}</h3>
        <span className="text-xs text-foreground-muted">
          {seleccionados.length}/{MAX_CARTAS_MAZO} cartas
        </span>
      </div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar reptil..." />
      <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
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
