"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import { resultadoRevelado, type Etapa } from "@/lib/card-game/estilo-ataque";
import { mensajeDeAtaque, type TonoMensaje } from "@/lib/card-game/mensajes";
import { cn } from "@/lib/utils";

interface AttackAnimationProps {
  resultado: Omit<ResultadoAtaque, "state"> | null;
  habilidadNombre?: string;
  /** Etapa actual de la secuencia de combate (null = sin animación). */
  etapa: Etapa | null;
}

const TONO_CLASES: Record<TonoMensaje, string> = {
  critico: "border-affinity-venenoso bg-affinity-venenoso/90 text-white",
  bueno: "border-state-ok bg-state-ok/95 text-[#04120b]",
  malo: "border-state-warn bg-state-warn/95 text-[#04120b]",
  neutro: "border-border-subtle bg-panel text-foreground",
  ko: "border-state-danger bg-state-danger/95 text-white",
};

/**
 * Cartel de combate, NO bloqueante (no tapa las cartas ni captura toques):
 * - Desde la preparación muestra el NOMBRE del ataque ("¡Aliento de Arena!") sin decir nada de su efectividad.
 * - Desde el impacto muestra el resultado ("¡Súper efectivo!", "No hizo nada…", "¡K.O.!").
 * El número de daño no va aquí: flota sobre la carta golpeada.
 */
export function AttackAnimation({ resultado, habilidadNombre, etapa }: AttackAnimationProps) {
  const revelado = !!resultado && etapa !== null && resultadoRevelado(etapa);

  useEffect(() => {
    // Vibración corta en celulares que la soporten, justo en el golpe (crítico y K.O. con patrón propio).
    if (!revelado || !resultado) return;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && navigator.userActivation?.hasBeenActive !== false) {
      try {
        navigator.vibrate(resultado.derrotado ? [60, 40, 120] : resultado.critico ? [40, 30, 40] : 25);
      } catch {
        /* algunos navegadores bloquean vibrate sin gesto previo: es solo un extra */
      }
    }
    // Solo cuando cambia el momento de revelar.
  }, [revelado]); // eslint-disable-line react-hooks/exhaustive-deps

  const mensaje = resultado
    ? mensajeDeAtaque({
        dano: resultado.danoEsperado,
        tier: resultado.tier,
        critico: resultado.critico,
        derrotado: resultado.derrotado,
        esquivado: resultado.esquivado,
        efecto: resultado.efectoAplicado,
      })
    : null;

  const mostrandoNombre = !!resultado && etapa !== null && !revelado && !!habilidadNombre;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence mode="wait">
        {mostrandoNombre && (
          <motion.div
            key={`nombre-${resultado.habilidadId}`}
            initial={{ opacity: 0, y: -12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="rounded-full border border-white/20 bg-black/75 px-4 py-1.5 text-sm font-black uppercase tracking-wide text-white shadow-lg"
          >
            ¡{habilidadNombre}!
          </motion.div>
        )}
        {revelado && mensaje && resultado && (
          <motion.div
            key={`resultado-${resultado.habilidadId}-${resultado.danoEsperado}-${resultado.critico}`}
            initial={{ opacity: 0, y: -16, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={cn("flex max-w-full flex-col items-center rounded-2xl border-2 px-4 py-2 text-center shadow-xl", TONO_CLASES[mensaje.tono])}
          >
            {habilidadNombre && <span className="max-w-[16rem] truncate text-[11px] font-semibold uppercase tracking-wide opacity-80">{habilidadNombre}</span>}
            <span className={cn("font-black leading-tight", mensaje.tono === "critico" || mensaje.tono === "ko" ? "text-2xl" : "text-xl")}>{mensaje.titulo}</span>
            {mensaje.detalle && <span className="text-xs font-bold">{mensaje.detalle}</span>}
            <span className="sr-only">Daño {Math.round(resultado.danoEsperado)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
