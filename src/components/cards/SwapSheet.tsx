"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Reptil } from "@/types/reptile";
import { AFFINITY_META } from "@/types/affinity";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import type { GameState, JugadorState } from "@/lib/card-game/types";
import { bancaDe } from "@/lib/card-game/engine";
import { GameCard } from "./GameCard";
import { HandStrip } from "./ActionDock";
import { cn } from "@/lib/utils";

export interface CandidatoCambio {
  reptil: Reptil;
  hpActual: number;
  hpMax: number;
  /** "mazo" = carta nueva (entra con vida completa); "banca" = ya jugada (entra con la vida que conservaba). */
  origen: "mazo" | "banca";
}

/** Cartas que pueden entrar ahora: las del mazo (nuevas) y las de la banca (con su vida conservada). */
export function candidatosDeCambio(jugador: JugadorState, configuracion: GameState["configuracion"], roster: Reptil[]): CandidatoCambio[] {
  const lista: CandidatoCambio[] = [];
  for (const id of jugador.mazo) {
    const reptil = roster.find((r) => r.id === id);
    const hpMax = configuracion.reptiles[id]?.hp ?? reptil?.hp ?? 0;
    if (reptil) lista.push({ reptil, hpActual: hpMax, hpMax, origen: "mazo" });
  }
  for (const c of bancaDe(jugador)) {
    const reptil = roster.find((r) => r.id === c.reptilId);
    const hpMax = configuracion.reptiles[c.reptilId]?.hp ?? reptil?.hp ?? 0;
    if (reptil) lista.push({ reptil, hpActual: c.hpActual, hpMax, origen: "banca" });
  }
  return lista;
}

interface SwapSheetProps {
  abierto: boolean;
  candidatos: CandidatoCambio[];
  onElegir: (reptilId: string) => void;
  onClose: () => void;
}

/** Selector de "Cambiar carta": hoja inferior en celular con la vida de cada carta disponible. */
export function SwapSheet({ abierto, candidatos, onElegir, onClose }: SwapSheetProps) {
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onClose]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="fondo-cambio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Cambiar carta"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-subtle bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-foreground">🔄 Cambiar carta</h2>
                <p className="text-xs text-foreground-muted">Gasta tu turno. La que sale conserva su vida.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-secondary text-foreground-muted">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {candidatos.map(({ reptil, hpActual, hpMax, origen }) => {
                const pct = Math.max(0, Math.min(100, (hpActual / Math.max(1, hpMax)) * 100));
                const meta = AFFINITY_META[reptil.afinidad];
                return (
                  <button
                    key={reptil.id}
                    type="button"
                    onClick={() => onElegir(reptil.id)}
                    style={{ borderColor: meta.color, touchAction: "manipulation" }}
                    className="overflow-hidden rounded-xl border-2 bg-panel-secondary text-left transition active:scale-[0.97]"
                  >
                    <div className="relative aspect-[4/3] w-full">
                      <ReptileImage nombre={reptil.nombre} nombreCientifico={reptil.nombreCientifico} className="h-full w-full" sizes="45vw" />
                      <span className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${meta.color}CC`, color: "#04120b" }}>
                        {meta.emoji}
                      </span>
                      <span
                        className={cn(
                          "absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-black",
                          origen === "mazo" ? "bg-reptile-green text-[#04120b]" : "bg-black/70 text-white",
                        )}
                      >
                        {origen === "mazo" ? "NUEVA" : "EN BANCA"}
                      </span>
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="truncate text-xs font-bold text-foreground">{reptil.nombre}</p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
                        <div className={cn("h-full rounded-full", pct > 50 ? "bg-state-ok" : pct > 20 ? "bg-state-warn" : "bg-state-danger")} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-right font-mono text-[10px] text-foreground-muted">
                        ❤️ {Math.round(hpActual)}/{hpMax}
                      </p>
                      <p className="flex justify-between text-[10px] font-semibold text-foreground">
                        <span>⚔️{reptil.atk}</span>
                        <span>🛡️{reptil.def}</span>
                        <span>⚡{reptil.spd}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Mano para invocar: cartas nuevas del mazo y, si las hay, cartas de la banca (con la vida que conservan). */
export function ManoInvocar({ candidatos, onElegir }: { candidatos: CandidatoCambio[]; onElegir: (reptilId: string) => void }) {
  return (
    <HandStrip>
      {candidatos.map(({ reptil, hpActual, origen }) => (
        <GameCard
          key={reptil.id}
          reptil={reptil}
          hpActual={origen === "banca" ? hpActual : undefined}
          size="sm"
          mostrarStats
          seleccionable
          onClick={() => onElegir(reptil.id)}
        />
      ))}
    </HandStrip>
  );
}
