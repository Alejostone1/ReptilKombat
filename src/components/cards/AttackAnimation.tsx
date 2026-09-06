"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ResultadoAtaque } from "@/lib/card-game/engine";

interface AttackAnimationProps {
  resultado: ResultadoAtaque | null;
  habilidadNombre?: string;
  onComplete: () => void;
}

/** Overlay transitorio de impacto: daño, multiplicador de afinidad y "¡SÚPER EFECTIVO!" cuando aplica. */
export function AttackAnimation({ resultado, habilidadNombre, onComplete }: AttackAnimationProps) {
  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(onComplete, 1400);
    return () => clearTimeout(t);
  }, [resultado, onComplete]);

  return (
    <AnimatePresence>
      {resultado && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            {habilidadNombre && (
              <p className="rounded-full bg-black/70 px-4 py-1 text-sm font-semibold text-white">{habilidadNombre}</p>
            )}
            <motion.p
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              className="text-6xl font-black text-state-danger drop-shadow-[0_0_12px_rgba(224,82,82,0.8)]"
            >
              -{Math.round(resultado.danoEsperado)}
            </motion.p>
            {resultado.superEfectivo && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                className="rounded-full bg-state-ok px-4 py-1 text-sm font-black uppercase tracking-wide text-[#04120b]"
              >
                ¡Súper efectivo!
              </motion.p>
            )}
            {resultado.stab > 1 && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 400 }}
                className="rounded-full bg-reptile-green/90 px-3 py-0.5 text-xs font-bold text-[#04120b]"
              >
                STAB ×{resultado.stab.toFixed(2)}
              </motion.p>
            )}
            {resultado.derrotado && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm font-semibold text-white"
              >
                💥 ¡Fuera de combate!
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
