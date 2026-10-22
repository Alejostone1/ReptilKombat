"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Barra de acción anclada al borde inferior en celular (siempre al alcance del pulgar, respeta el
 * "notch"/barra de gestos con safe-area); en pantallas grandes es un panel normal bajo el tablero.
 * Debe ir como hijo directo del `<main>` con padding de 1rem (de ahí los márgenes negativos).
 */
export function ActionDock({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "sticky bottom-0 z-30 mt-auto -mx-4 -mb-4 border-t border-border-subtle bg-background/95 px-3 pt-2 backdrop-blur",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:static md:z-auto md:mx-0 md:mb-0 md:rounded-xl md:border md:bg-panel md:p-4 md:backdrop-blur-none",
        className,
      )}
    >
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground-muted">{titulo}</h2>
      {children}
    </section>
  );
}

/** Mano de cartas para invocar: tira horizontal con "imán" en celular, cuadrícula centrada en pantallas grandes. */
export function HandStrip({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [&>*]:shrink-0 [&>*]:snap-center sm:flex-wrap sm:justify-center sm:overflow-visible">
      {children}
    </div>
  );
}
