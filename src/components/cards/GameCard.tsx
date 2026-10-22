"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Reptil } from "@/types/reptile";
import { ReptileImage } from "@/components/reptiles/ReptileImage";
import { AFFINITY_META } from "@/types/affinity";
import { STAT_ORDER, STAT_LABELS } from "@/lib/game-engine/stat-labels";
import type { EstadoActivo } from "@/lib/card-game/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  reptil: Reptil;
  hpActual?: number;
  /** Si se pasan junto con `energiaMax`, muestra la barra de energía debajo de la de HP (solo en size !== "sm"). */
  energiaActual?: number;
  energiaMax?: number;
  size?: "sm" | "md" | "lg";
  /** Muestra ⚔️ ataque, 🛡️ defensa y ⚡ velocidad también en tamaño "sm" (mano al invocar). */
  mostrarStats?: boolean;
  seleccionable?: boolean;
  seleccionada?: boolean;
  deshabilitada?: boolean;
  onClick?: () => void;
  animarEntrada?: boolean;
  sacudir?: boolean;
  /** Estados activos (veneno, buffs, debuffs) como fichas pequeñas bajo el nombre. */
  estados?: EstadoActivo[];
  /** Turnos que le quedan aturdida (se muestra ficha 💫). */
  aturdidoTurnos?: number;
  /** Resplandor de "es el turno de esta carta" (estilo duelo de cartas). */
  turnoActivo?: boolean;
  /** Dirección de la embestida de ataque: 1 = hacia la derecha, -1 = hacia la izquierda, null = quieta. */
  embestida?: 1 | -1 | null;
  /** Texto que flota sobre la carta al recibir un golpe (el `id` re-dispara la animación). */
  impacto?: { id: number; texto: string; tono: TonoImpacto } | null;
}

export type TonoImpacto = "dano" | "critico" | "curacion" | "info";

const FICHA_ESTADO: Record<EstadoActivo["tipo"], { emoji: string; label: string; tono: string }> = {
  veneno: { emoji: "☠️", label: "Veneno", tono: "bg-affinity-venenoso/80" },
  debuff_atk: { emoji: "⚔️↓", label: "Ataque reducido", tono: "bg-state-danger/80" },
  debuff_def: { emoji: "🛡️↓", label: "Defensa reducida", tono: "bg-state-danger/80" },
  buff_atk: { emoji: "⚔️↑", label: "Ataque potenciado", tono: "bg-state-ok/80" },
  buff_def: { emoji: "🛡️↑", label: "Defensa potenciada", tono: "bg-state-ok/80" },
  buff_spd: { emoji: "⚡↑", label: "Velocidad potenciada", tono: "bg-state-ok/80" },
};

const TONO_IMPACTO: Record<TonoImpacto, string> = {
  dano: "text-state-danger",
  critico: "text-affinity-venenoso",
  curacion: "text-state-ok",
  info: "text-foreground",
};

const UMBRAL_HP_CRITICO = 15;

const SIZE_CLASSES = {
  sm: "w-24 sm:w-28",
  md: "w-32 sm:w-40",
  // "lg" es la carta de arena: en celular cada una ocupa ~40 % del ancho para que las dos quepan lado a lado.
  lg: "w-[40vw] max-w-[10.5rem] sm:w-48 sm:max-w-none md:w-56",
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
  mostrarStats,
  seleccionable,
  seleccionada,
  deshabilitada,
  onClick,
  animarEntrada,
  sacudir,
  estados,
  aturdidoTurnos,
  turnoActivo,
  embestida,
  impacto,
}: GameCardProps) {
  const reducirMovimiento = useReducedMotion();
  const color = AFFINITY_META[reptil.afinidad].color;
  const hpMax = reptil.hp;
  const hp = hpActual ?? hpMax;
  const pctHp = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  const critico = pctHp > 0 && pctHp <= UMBRAL_HP_CRITICO;
  const pctEnergia = energiaMax && energiaMax > 0 ? Math.max(0, Math.min(100, ((energiaActual ?? energiaMax) / energiaMax) * 100)) : null;

  return (
    <motion.div
      className={cn("relative", SIZE_CLASSES[size])}
      animate={embestida && !reducirMovimiento ? { x: [0, embestida * 26, 0], scale: [1, 1.07, 1] } : { x: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick || deshabilitada}
      initial={animarEntrada ? { opacity: 0, scale: 0.4, rotateY: 180 } : false}
      animate={
        sacudir
          ? { x: reducirMovimiento ? 0 : [0, -8, 8, -6, 6, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] }
          : { opacity: 1, scale: 1, rotateY: 0 }
      }
      transition={sacudir ? { duration: 0.4 } : { type: "spring", stiffness: 260, damping: 20 }}
      whileHover={seleccionable && !deshabilitada ? { y: -4 } : undefined}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-xl border-2 bg-panel text-left shadow-lg transition-shadow",
        turnoActivo && "shadow-[0_0_18px_2px_var(--glow)]",
        seleccionada ? "ring-2 ring-reptile-green" : "",
        deshabilitada && "opacity-40 grayscale",
        seleccionable && !deshabilitada && "cursor-pointer hover:shadow-xl",
      )}
      style={{ borderColor: color, ["--glow" as string]: `${color}AA` }}
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
          {((estados && estados.length > 0) || (aturdidoTurnos ?? 0) > 0) && (
            <div className="flex flex-wrap gap-0.5" aria-label="Estados activos">
              {(aturdidoTurnos ?? 0) > 0 && (
                <span className="rounded bg-state-warn/80 px-1 text-[9px] font-bold text-[#04120b]" title="Aturdida: pierde el turno">
                  💫{aturdidoTurnos}
                </span>
              )}
              {estados?.map((e, i) => (
                <span key={`${e.tipo}-${i}`} className={cn("rounded px-1 text-[9px] font-bold text-white", FICHA_ESTADO[e.tipo].tono)} title={FICHA_ESTADO[e.tipo].label}>
                  {FICHA_ESTADO[e.tipo].emoji}
                  {e.turnosRestantes}
                </span>
              ))}
            </div>
          )}

          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-panel-secondary">
            {/* "Fantasma": la vida perdida se queda un instante en blanco y luego se vacía, como en los juegos de lucha. */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white/70"
              animate={{ width: `${pctHp}%` }}
              transition={{ duration: 0.6, delay: 0.35 }}
            />
            <motion.div
              className={cn("relative h-full rounded-full", pctHp > 50 ? "bg-state-ok" : pctHp > 20 ? "bg-state-warn" : "bg-state-danger")}
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

          {size === "sm" && mostrarStats && (
            <div className="grid grid-cols-3 gap-0.5 pt-0.5 text-center text-[10px] font-semibold text-foreground">
              {(["atk", "def", "spd"] as const).map((k) => (
                <div key={k} title={STAT_LABELS[k].largo}>
                  {STAT_LABELS[k].emoji}
                  {reptil[k]}
                </div>
              ))}
            </div>
          )}

          {size !== "sm" && (
            <div className="grid grid-cols-3 gap-0.5 pt-1 text-center text-[10px] font-semibold text-foreground">
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

      <AnimatePresence>
        {impacto && (
          <motion.span
            key={impacto.id}
            initial={{ opacity: 0, y: 6, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -46, scale: impacto.tono === "critico" ? [0.5, 1.5, 1.3, 1.3] : [0.5, 1.25, 1.1, 1.1] }}
            transition={{ duration: 1.1, times: [0, 0.2, 0.7, 1] }}
            className={cn(
              "pointer-events-none absolute left-1/2 top-1/3 z-20 -translate-x-1/2 whitespace-nowrap text-3xl font-black [text-shadow:0_2px_0_#000,0_0_10px_rgba(0,0,0,0.8)] sm:text-4xl",
              TONO_IMPACTO[impacto.tono],
            )}
          >
            {impacto.texto}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
