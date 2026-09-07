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
  size?: "sm" | "md" | "lg";
  seleccionable?: boolean;
  seleccionada?: boolean;
  deshabilitada?: boolean;
  onClick?: () => void;
  animarEntrada?: boolean;
  sacudir?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-24 sm:w-28",
  md: "w-32 sm:w-40",
  lg: "w-36 sm:w-48 md:w-56",
};

export function GameCard({
  reptil,
  hpActual,
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
    </motion.button>
  );
}
