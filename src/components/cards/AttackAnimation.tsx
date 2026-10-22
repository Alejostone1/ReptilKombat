"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import { mensajeDeAtaque, type TonoMensaje } from "@/lib/card-game/mensajes";
import { cn } from "@/lib/utils";

interface AttackAnimationProps {
  resultado: Omit<ResultadoAtaque, "state"> | null;
  habilidadNombre?: string;
  onComplete: () => void;
}

const TONO_CLASES: Record<TonoMensaje, string> = {
  critico: "border-affinity-venenoso bg-affinity-venenoso/90 text-white",
  bueno: "border-state-ok bg-state-ok/95 text-[#04120b]",
  malo: "border-state-warn bg-state-warn/95 text-[#04120b]",
  neutro: "border-border-subtle bg-panel text-foreground",
  ko: "border-state-danger bg-state-danger/95 text-white",
};

/**
 * Cartel de resultado, NO bloqueante: aparece arriba (sobre la zona de cartas, sin taparlas ni capturar
 * toques) con el nombre del ataque y la frase corta ("¡Súper efectivo!", "No hizo nada…"). El número de
 * daño no va aquí: flota sobre la carta golpeada (ver GameCard `impacto`).
 */
export function AttackAnimation({ resultado, habilidadNombre, onComplete }: AttackAnimationProps) {
  useEffect(() => {
    if (!resultado) return;
    // Vibración corta en celulares que la soporten (crítico y K.O. con patrón propio).
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(resultado.derrotado ? [60, 40, 120] : resultado.critico ? [40, 30, 40] : 25);
      } catch {
        /* algunos navegadores bloquean vibrate sin gesto previo: es solo un extra */
      }
    }
    const t = setTimeout(onComplete, resultado.critico || resultado.derrotado ? 1900 : 1500);
    return () => clearTimeout(t);
  }, [resultado, onComplete]);

  const mensaje = resultado
    ? mensajeDeAtaque({
        dano: resultado.danoEsperado,
        tier: resultado.tier,
        critico: resultado.critico,
        derrotado: resultado.derrotado,
        efecto: resultado.efectoAplicado,
      })
    : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {resultado && mensaje && (
          <motion.div
            key={`${resultado.habilidadId}-${resultado.danoEsperado}-${resultado.critico}`}
            initial={{ opacity: 0, y: -16, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={cn("flex max-w-full flex-col items-center rounded-2xl border-2 px-4 py-2 text-center shadow-xl", TONO_CLASES[mensaje.tono])}
          >
            {habilidadNombre && <span className="max-w-[16rem] truncate text-[11px] font-semibold uppercase tracking-wide opacity-80">{habilidadNombre}</span>}
            <span className={cn("font-black leading-tight", mensaje.tono === "critico" || mensaje.tono === "ko" ? "text-2xl" : "text-xl")}>
              {mensaje.titulo}
            </span>
            {mensaje.detalle && <span className="text-xs font-bold">{mensaje.detalle}</span>}
            <span className="sr-only">Daño {Math.round(resultado.danoEsperado)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
