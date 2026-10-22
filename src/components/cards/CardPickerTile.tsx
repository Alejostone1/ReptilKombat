"use client";

import { useRef } from "react";
import type { Reptil } from "@/types/reptile";
import { AFFINITY_META } from "@/types/affinity";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import { STAT_LABELS } from "@/lib/game-engine/stat-labels";
import { normalizarStat, nivelStat, STATS_COMPARABLES, type StatComparable } from "@/lib/game-engine/stat-compare";
import { cn } from "@/lib/utils";

interface CardPickerTileProps {
  reptil: Reptil;
  /** Máximo de cada stat en el roster: la barra al 100 % es "el mejor de todos". */
  maximos: Record<StatComparable, number>;
  seleccionada?: boolean;
  deshabilitada?: boolean;
  onToggle: () => void;
  onVerDetalle: () => void;
}

const COLOR_BARRA: Record<StatComparable, string> = {
  hp: "bg-state-ok",
  atk: "bg-state-danger",
  def: "bg-affinity-acuatico",
  spd: "bg-state-warn",
};

const MS_PRESION_LARGA = 500;

/**
 * Carta para la pantalla de selección: muestra vida, ataque, defensa y velocidad como barras
 * comparables (con los mismos íconos que la carta de combate). Tocar = elegir; ℹ️ o mantener
 * presionado = ver detalle (descripción y nombres de ataques).
 */
export function CardPickerTile({ reptil, maximos, seleccionada, deshabilitada, onToggle, onVerDetalle }: CardPickerTileProps) {
  const color = AFFINITY_META[reptil.afinidad].color;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presionLarga = useRef(false);

  function limpiarTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function onPointerDown() {
    presionLarga.current = false;
    limpiarTimer();
    timer.current = setTimeout(() => {
      presionLarga.current = true;
      onVerDetalle();
    }, MS_PRESION_LARGA);
  }

  function onClick() {
    // Si la presión larga ya abrió el detalle, el "click" que sigue al soltar no debe elegir la carta.
    if (presionLarga.current) {
      presionLarga.current = false;
      return;
    }
    if (!deshabilitada) onToggle();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={seleccionada}
      aria-disabled={deshabilitada}
      aria-label={`${reptil.nombre}: vida ${reptil.hp}, ataque ${reptil.atk}, defensa ${reptil.def}, velocidad ${reptil.spd}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!deshabilitada) onToggle();
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={limpiarTimer}
      onPointerLeave={limpiarTimer}
      onPointerCancel={limpiarTimer}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative flex select-none flex-col overflow-hidden rounded-xl border-2 bg-panel text-left shadow-md transition",
        "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-reptile-green",
        seleccionada && "ring-2 ring-reptile-green",
        deshabilitada && "cursor-not-allowed opacity-40 grayscale hover:translate-y-0",
      )}
      style={{ borderColor: color, touchAction: "manipulation" }}
    >
      <div className="relative aspect-[4/3] w-full">
        <ReptileImage nombre={reptil.nombre} nombreCientifico={reptil.nombreCientifico} className="h-full w-full" sizes="(max-width: 640px) 45vw, 200px" sinCredito />
        <span className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${color}CC`, color: "#04120b" }}>
          {AFFINITY_META[reptil.afinidad].emoji}
        </span>
        <button
          type="button"
          aria-label={`Ver detalle de ${reptil.nombre}`}
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-xs text-white hover:bg-black/85"
        >
          ℹ️
        </button>
        {seleccionada && (
          <span className="absolute bottom-1 left-1 rounded-full bg-reptile-green px-2 py-0.5 text-[10px] font-black text-[#04120b]">✓ ELEGIDA</span>
        )}
      </div>

      <div className="space-y-1.5 p-2">
        <p className="truncate text-xs font-bold text-foreground">{reptil.nombre}</p>
        <div className="space-y-1">
          {STATS_COMPARABLES.map((k) => {
            const pct = normalizarStat(reptil[k], maximos[k]);
            return (
              <div key={k} className="flex items-center gap-1.5" title={`${STAT_LABELS[k].largo} (${nivelStat(pct)})`}>
                <span className="w-4 shrink-0 text-center text-[11px]" aria-hidden>
                  {STAT_LABELS[k].emoji}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-secondary">
                  <div className={cn("h-full rounded-full", COLOR_BARRA[k])} style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-[10px] text-foreground-muted">{reptil[k]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
