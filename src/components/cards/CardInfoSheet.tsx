"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Reptil } from "@/types/reptile";
import { AFFINITY_META } from "@/types/affinity";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import { useRoster } from "@/lib/hooks/useRoster";
import { CATEGORIA_INFO } from "@/lib/game-engine/categorias";
import { STAT_LABELS } from "@/lib/game-engine/stat-labels";

interface CardInfoSheetProps {
  reptil: Reptil | null;
  onClose: () => void;
}

/**
 * Detalle de una carta: descripción y NOMBRES de sus ataques. A propósito no muestra potencia,
 * precisión ni daño: el jugador descubre cuánto pega cada ataque jugando.
 */
export function CardInfoSheet({ reptil, onClose }: CardInfoSheetProps) {
  const { abilities } = useRoster();

  useEffect(() => {
    if (!reptil) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reptil, onClose]);

  const ataques = reptil ? abilities.filter((a) => a.propietarioId === reptil.id) : [];
  const meta = reptil ? AFFINITY_META[reptil.afinidad] : null;

  return (
    <AnimatePresence>
      {reptil && meta && (
        <motion.div
          key="fondo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={`Detalle de ${reptil.nombre}`}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-subtle bg-panel p-4 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <ReptileImage
                nombre={reptil.nombre}
                nombreCientifico={reptil.nombreCientifico}
                className="h-24 w-24 shrink-0 rounded-xl border-2"
                sizes="96px"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black leading-tight text-foreground">{reptil.nombre}</h2>
                <p className="truncate text-xs italic text-foreground-muted">{reptil.nombreCientifico}</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: meta.color }}>
                  {meta.emoji} {reptil.afinidad} · {reptil.rolTactico}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full px-2 py-1 text-lg leading-none text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-foreground">{reptil.descripcion}</p>

            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px] text-foreground-muted">
              <Dato titulo={STAT_LABELS.inst.largo} valor={`${STAT_LABELS.inst.emoji} ${reptil.inst}`} />
              <Dato titulo={STAT_LABELS.adp.largo} valor={`${STAT_LABELS.adp.emoji} ${reptil.adp}`} />
              <Dato titulo="Energía" valor={`⚡ ${reptil.energiaMax}`} />
              <Dato titulo="Crítico" valor={`🎯 ${reptil.criticoProbabilidad}%`} />
            </div>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-foreground-muted">Sus ataques</h3>
            <ul className="mt-1.5 space-y-1.5">
              {ataques.length === 0 && <li className="text-xs text-foreground-muted">Cargando ataques...</li>}
              {ataques.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-panel-secondary px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-foreground">{a.nombre}</span>
                  <span className="text-xs text-foreground-muted">
                    {CATEGORIA_INFO[a.categoria].icono} {CATEGORIA_INFO[a.categoria].nombre}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-foreground-muted">¿Cuánto pega cada uno? Eso lo descubres peleando.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-panel-secondary px-1 py-1.5">
      <p className="truncate text-[9px] uppercase tracking-wide">{titulo}</p>
      <p className="font-mono text-xs text-foreground">{valor}</p>
    </div>
  );
}
