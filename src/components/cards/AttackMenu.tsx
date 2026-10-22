"use client";

import type { OpcionAtaque } from "@/lib/card-game/opciones-ataque";
import { CATEGORIA_INFO } from "@/lib/game-engine/categorias";
import type { MatchupTier } from "@/types/affinity";
import { cn } from "@/lib/utils";

interface AttackMenuProps {
  opciones: OpcionAtaque[];
  /** HIDE_ATTACK_DAMAGE: sin números, sin "mejor opción", sin etiquetas de fuerza, orden fijo. Apagado = menú clásico con ≈daño. */
  ocultarDano: boolean;
  onAtacar: (habilidadId: string) => void;
  /** Bloquea toques mientras se resuelve una acción (online: evita doble envío). */
  ocupado?: boolean;
}

const TIER_HINT: Record<MatchupTier, { emoji: string; texto: string; clase: string }> = {
  ventaja: { emoji: "🟢", texto: "Ventaja", clase: "text-state-ok" },
  desventaja: { emoji: "🔴", texto: "Desventaja", clase: "text-state-danger" },
  neutral: { emoji: "⚪", texto: "Neutral", clase: "text-foreground-muted" },
};

/**
 * Menú de ataques (celular primero: 2 columnas con zonas táctiles de ≥64 px). Con el daño oculto el
 * jugador solo ve nombre, tipo de ataque, ventaja de afinidad, costo y recarga: el juego NO le dice
 * qué ataque es débil o fuerte; lo deduce mirando las estadísticas de las cartas. Compartido por la mesa local y la sala online.
 */
export function AttackMenu({ opciones, ocultarDano, onAtacar, ocupado }: AttackMenuProps) {
  const mejor = ocultarDano ? -1 : opciones.findIndex((o) => o.disponible);
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map(({ habilidad: h, tier, disponible, cooldownRestante, danoEstimado }, i) => {
        const cat = CATEGORIA_INFO[h.categoria];
        const hint = TIER_HINT[tier];
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => disponible && !ocupado && onAtacar(h.id)}
            disabled={!disponible || ocupado}
            aria-label={`${h.nombre}, ${cat.nombre}${disponible ? "" : ", no disponible"}`}
            style={{ touchAction: "manipulation" }}
            className={cn(
              "flex min-h-[4.25rem] flex-col justify-between gap-1 rounded-xl border bg-panel-secondary px-2.5 py-2 text-left transition active:scale-[0.97]",
              disponible ? "hover:border-reptile-green/60" : "cursor-not-allowed opacity-40",
              i === mejor ? "border-reptile-green/60" : "border-border-subtle",
            )}
          >
            <span className="flex items-start gap-1.5">
              <span className="text-base leading-none" aria-hidden>
                {cat.icono}
              </span>
              <span className="line-clamp-2 text-[13px] font-bold leading-tight text-foreground">{h.nombre}</span>
            </span>

            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
              <span className={cn("font-semibold", hint.clase)}>
                {hint.emoji} {hint.texto}
              </span>
              {h.costoEnergia > 0 && <span className="text-foreground-muted">⚡{h.costoEnergia}</span>}
              {cooldownRestante > 0 ? (
                <span className="font-semibold text-state-danger">⏱️ {cooldownRestante}</span>
              ) : h.cooldownTurnos > 0 ? (
                <span className="text-state-ok">✅</span>
              ) : null}
              {!ocultarDano && <span className="rounded-full bg-reptile-green/15 px-1.5 py-px font-semibold text-reptile-green">≈{Math.round(danoEstimado)}</span>}
              {!ocultarDano && i === mejor && <span className="font-bold text-state-ok">★ Mejor</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
