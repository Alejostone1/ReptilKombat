"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FaseJuego, Lado } from "@/lib/card-game/types";

interface TurnBannerProps {
  turno: Lado;
  numeroTurno: number;
  fase: FaseJuego;
  nombreTurno: string;
}

const FASE_LABEL: Record<FaseJuego, string> = {
  invocando: "Fase de invocación",
  combatiendo: "Fase de combate",
  terminado: "Partida terminada",
};

export function TurnBanner({ turno, numeroTurno, fase, nombreTurno }: TurnBannerProps) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-panel py-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${turno}-${numeroTurno}`}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="text-center"
        >
          <p className="text-[10px] uppercase tracking-widest text-foreground-muted">
            Turno {numeroTurno} · {FASE_LABEL[fase]}
          </p>
          <p className={`text-lg font-bold ${turno === "A" ? "text-affinity-agil" : "text-affinity-termico"}`}>
            {nombreTurno}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
