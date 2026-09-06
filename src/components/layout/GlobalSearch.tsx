"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useRoster } from "@/lib/hooks/useRoster";
import { AFFINITIES, AFFINITY_META } from "@/types/affinity";
import { FAMILIES_INFO } from "@/data/families";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { roster: ROSTER, abilities: ABILITIES } = useRoster();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const familyNames = useMemo(() => Array.from(new Set(FAMILIES_INFO.map((f) => f.familia))), []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm text-foreground-muted hover:border-reptile-green/40"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Buscar reptiles, habilidades...</span>
        <kbd className="rounded border border-border-subtle bg-panel px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-xl border border-border-subtle bg-[#0a1815] shadow-2xl">
            <Command label="Búsqueda global" className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border-subtle px-4">
                <Search size={16} className="text-foreground-muted" />
                <Command.Input
                  autoFocus
                  placeholder="Escribe para buscar reptiles, habilidades, familias o afinidades..."
                  className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-foreground-muted"
                />
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">
                  Sin resultados.
                </Command.Empty>

                <Command.Group heading="Reptiles" className="px-2 py-1 text-[10px] uppercase tracking-wide text-foreground-muted">
                  {ROSTER.map((r) => (
                    <Command.Item
                      key={r.id}
                      value={`${r.nombre} ${r.nombreCientifico} ${r.familia} ${r.afinidad} ${r.rolTactico}`}
                      onSelect={() => go(`/reptiles/${r.id}`)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-panel-secondary"
                    >
                      {AFFINITY_META[r.afinidad].emoji} {r.nombre}{" "}
                      <span className="text-xs italic text-foreground-muted">{r.nombreCientifico}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Habilidades" className="px-2 py-1 text-[10px] uppercase tracking-wide text-foreground-muted">
                  {ABILITIES.slice(0, 40).map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`${a.nombre} ${a.afinidad} ${a.categoria}`}
                      onSelect={() => go(`/habilidades?buscar=${encodeURIComponent(a.nombre)}`)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-panel-secondary"
                    >
                      ⚔️ {a.nombre}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Familias" className="px-2 py-1 text-[10px] uppercase tracking-wide text-foreground-muted">
                  {familyNames.map((fam) => (
                    <Command.Item
                      key={fam}
                      value={fam}
                      onSelect={() => go(`/familias?familia=${encodeURIComponent(fam)}`)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-panel-secondary"
                    >
                      🧬 {fam}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Afinidades" className="px-2 py-1 text-[10px] uppercase tracking-wide text-foreground-muted">
                  {AFFINITIES.map((af) => (
                    <Command.Item
                      key={af}
                      value={af}
                      onSelect={() => go(`/afinidades`)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground data-[selected=true]:bg-panel-secondary"
                    >
                      {AFFINITY_META[af].emoji} {af}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
