"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import type { TipoEstado } from "@/lib/card-game/types";

interface AttackAnimationProps {
  resultado: Omit<ResultadoAtaque, "state"> | null;
  habilidadNombre?: string;
  onComplete: () => void;
}

const EFECTO_INFO: Record<TipoEstado | "curacion", { label: string; emoji: string }> = {
  veneno: { label: "¡Envenenado!", emoji: "☠️" },
  debuff_atk: { label: "Ataque reducido", emoji: "📉" },
  debuff_def: { label: "Defensa reducida", emoji: "📉" },
  buff_atk: { label: "Ataque potenciado", emoji: "📈" },
  buff_def: { label: "Defensa potenciada", emoji: "📈" },
  buff_spd: { label: "Velocidad potenciada", emoji: "📈" },
  curacion: { label: "¡Curación!", emoji: "💚" },
};

/** Overlay transitorio de impacto: daño, crítico, multiplicador de afinidad, efecto aplicado y "¡SÚPER EFECTIVO!" cuando aplica. */
export function AttackAnimation({ resultado, habilidadNombre, onComplete }: AttackAnimationProps) {
  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(onComplete, resultado.critico ? 1700 : 1400);
    return () => clearTimeout(t);
  }, [resultado, onComplete]);

  const efecto = resultado?.efectoAplicado ? EFECTO_INFO[resultado.efectoAplicado.tipo] : null;

  return (
    <AnimatePresence>
      {resultado && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={resultado.critico ? { opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={resultado.critico ? { duration: 0.4 } : undefined}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: resultado.critico ? [0.3, 1.35, 1.15] : [0.3, 1.15, 1], opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            {habilidadNombre && (
              <p className="rounded-full bg-black/70 px-4 py-1 text-sm font-semibold text-white">{habilidadNombre}</p>
            )}
            {resultado.critico && (
              <motion.p
                initial={{ scale: 0, rotate: -8 }}
                animate={{ scale: 1, rotate: -4 }}
                transition={{ type: "spring", stiffness: 500 }}
                className="text-2xl font-black uppercase tracking-widest text-affinity-venenoso drop-shadow-[0_0_10px_rgba(142,68,173,0.9)]"
              >
                ⚔️ ¡Crítico!
              </motion.p>
            )}
            <motion.p
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              className={
                resultado.critico
                  ? "text-7xl font-black text-affinity-venenoso drop-shadow-[0_0_16px_rgba(142,68,173,0.9)]"
                  : "text-6xl font-black text-state-danger drop-shadow-[0_0_12px_rgba(224,82,82,0.8)]"
              }
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
            {efecto && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                className="rounded-full bg-affinity-venenoso/90 px-3 py-0.5 text-xs font-bold text-white"
              >
                {efecto.emoji} {efecto.label}
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
