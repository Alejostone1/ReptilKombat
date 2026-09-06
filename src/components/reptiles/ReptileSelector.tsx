"use client";

import { useMemo, useState } from "react";
import type { Reptil } from "@/types/reptile";
import { useRoster } from "@/lib/hooks/useRoster";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { cn } from "@/lib/utils";

interface ReptileSelectorProps {
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string;
  placeholder?: string;
}

export function ReptileSelector({ value, onChange, exclude, placeholder = "Buscar reptil..." }: ReptileSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { roster: ROSTER } = useRoster();

  const selected = ROSTER.find((r) => r.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROSTER.filter((r) => r.id !== exclude)
      .filter(
        (r) =>
          !q ||
          r.nombre.toLowerCase().includes(q) ||
          r.nombreCientifico.toLowerCase().includes(q) ||
          r.familia.toLowerCase().includes(q) ||
          r.afinidad.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [query, exclude, ROSTER]);

  return (
    <div className="relative">
      <input
        value={open ? query : (selected?.nombre ?? "")}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-reptile-green/60"
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border-subtle bg-[#0a1815] shadow-2xl">
          {filtered.length === 0 && <div className="px-3 py-3 text-xs text-foreground-muted">Sin resultados.</div>}
          {filtered.map((r: Reptil) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(r.id);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-panel-secondary",
                value === r.id && "bg-panel-secondary",
              )}
            >
              <span>
                <span className="text-foreground">{r.nombre}</span>{" "}
                <span className="text-xs italic text-foreground-muted">{r.nombreCientifico}</span>
              </span>
              <AffinityBadge afinidad={r.afinidad} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
