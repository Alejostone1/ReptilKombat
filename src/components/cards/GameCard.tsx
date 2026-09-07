"use client";

import { motion } from "framer-motion";
import type { Reptil } from "@/types/reptile";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import { AFFINITY_META } from "@/types/affinity";
import { STAT_ORDER, STAT_LABELS } from "@/lib/game-engine/stat-labels";
import { cn } from "@/lib/utils";

interface GameCardProps {
  reptil: Reptil;
  hpActual?: number;
  /** Si se pasan junto con `energiaMax`, muestra la barra de energía debajo de la de HP (solo en size !== "sm"). */
  energiaActual?: number;
  energiaMax?: number;
  size?: "sm" | "md" | "lg";
  seleccionable?: boolean;
  seleccionada?: boolean;
  deshabilitada?: boolean;
  onClick?: () => void;
  animarEntrada?: boolean;
  sacudir?: boolean;
}

const UMBRAL_HP_CRITICO = 15;

const SIZE_CLASSES = {
  sm: "w-24 sm:w-28",
  md: "w-32 sm:w-40",
  lg: "w-36 sm:w-48 md:w-56",
};

/** Degradación visual progresiva según el % de HP restante: sana → dañada → gris → gris+rojiza → derrotada. */
function filtroPorHp(pctHp: number): string {
  if (pctHp <= 0) return "grayscale(1) brightness(0.55)";
  if (pctHp <= 25) return "grayscale(0.7) sepia(0.35) hue-rotate(-40deg) saturate(1.4) brightness(0.85)";
  if (pctHp <= 50) return "grayscale(0.45) brightness(0.92)";
  if (pctHp <= 75) return "grayscale(0.15)";
  return "grayscale(0) brightness(1)";
}

export function GameCard({
  reptil,
  hpActual,
  energiaActual,
  energiaMax,
  size = "md",
  seleccionable,
  seleccionada,
  deshabilitada,
  onClick,
  animarEntrada,
  sacudir,
}: GameCardProps) {
  const color = AFFINITY_META[reptil.afinidad].color;
  const hpMax = reptil.hp;
  const hp = hpActual ?? hpMax;
  const pctHp = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  const critico = pctHp > 0 && pctHp <= UMBRAL_HP_CRITICO;
  const pctEnergia = energiaMax && energiaMax > 0 ? Math.max(0, Math.min(100, ((energiaActual ?? energiaMax) / energiaMax) * 100)) : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick || deshabilitada}
      initial={animarEntrada ? { opacity: 0, scale: 0.4, rotateY: 180 } : false}
      animate={
        sacudir
          ? { x: [0, -8, 8, -6, 6, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] }
          : { opacity: 1, scale: 1, rotateY: 0 }
      }
      transition={sacudir ? { duration: 0.4 } : { type: "spring", stiffness: 260, damping: 20 }}
      whileHover={seleccionable && !deshabilitada ? { y: -4 } : undefined}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border-2 bg-panel text-left shadow-lg transition-shadow",
        SIZE_CLASSES[size],
        seleccionada ? "ring-2 ring-reptile-green" : "",
        deshabilitada && "opacity-40 grayscale",
        seleccionable && !deshabilitada && "cursor-pointer hover:shadow-xl",
      )}
      style={{ borderColor: color }}
    >
      <motion.div
        className="flex h-full flex-col"
        animate={{ filter: filtroPorHp(pctHp) }}
        transition={{ duration: 0.6 }}
      >
        <div className="relative aspect-square w-full">
          <ReptileImage nombre={reptil.nombre} nombreCientifico={reptil.nombreCientifico} className="h-full w-full" />
          <span
            className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: `${color}CC`, color: "#04120b" }}
          >
            {AFFINITY_META[reptil.afinidad].emoji}
          </span>
        </div>

        <div className="space-y-1 p-2">
          <p className="truncate text-xs font-bold text-foreground">{reptil.nombre}</p>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-secondary">
            <motion.div
              className={cn("h-full rounded-full", pctHp > 50 ? "bg-state-ok" : pctHp > 20 ? "bg-state-warn" : "bg-state-danger")}
              animate={{ width: `${pctHp}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-right font-mono text-[10px] text-foreground-muted">
            {STAT_LABELS.hp.emoji} {Math.round(hp)}/{hpMax}
          </p>
          {critico && (
            <motion.p
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-center text-[9px] font-black uppercase tracking-wide text-state-danger"
            >
              ⚠️ Critical HP
            </motion.p>
          )}

          {size !== "sm" && pctEnergia !== null && (
            <>
              <div className="h-1 w-full overflow-hidden rounded-full bg-panel-secondary">
                <motion.div className="h-full rounded-full bg-affinity-agil" animate={{ width: `${pctEnergia}%` }} transition={{ duration: 0.4 }} />
              </div>
              <p className="text-right font-mono text-[9px] text-foreground-muted">
                ⚡ {Math.round(energiaActual ?? energiaMax ?? 0)}/{energiaMax}
              </p>
            </>
          )}

          {size !== "sm" && (
            <div className="grid grid-cols-3 gap-0.5 pt-1 text-center text-[9px] text-foreground-muted">
              {STAT_ORDER.filter((k) => k !== "hp").map((k) => (
                <div key={k} title={STAT_LABELS[k].largo}>
                  {STAT_LABELS[k].emoji}
                  {reptil[k]}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {pctHp <= 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/55"
        >
          <span className="text-2xl drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">💀</span>
        </motion.div>
      )}
    </motion.button>
  );
}
