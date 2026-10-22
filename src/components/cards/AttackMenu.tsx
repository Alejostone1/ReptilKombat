"use client";

import type { OpcionAtaque } from "@/lib/card-game/opciones-ataque";
import type { MemoriaAtaques, NivelDano } from "@/lib/card-game/memoria-ataques";
import { ETIQUETA_NIVEL } from "@/lib/card-game/memoria-ataques";
import { CATEGORIA_INFO } from "@/lib/game-engine/categorias";
import type { MatchupTier } from "@/types/affinity";
import { cn } from "@/lib/utils";

interface AttackMenuProps {
  opciones: OpcionAtaque[];
  memoria: MemoriaAtaques;
  /** HIDE_ATTACK_DAMAGE: sin números, sin "mejor opción", orden fijo. Apagado = menú clásico con ≈daño. */
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

const CLASE_NIVEL: Record<NivelDano, string> = {
  debil: "bg-state-warn/20 text-state-warn",
  medio: "bg-reptile-green/20 text-reptile-green",
  fuerte: "bg-state-danger/20 text-state-danger",
  efecto: "bg-affinity-venenoso/25 text-affinity-venenoso",
};

/**
 * Menú de ataques (celular primero: 2 columnas con zonas táctiles de ≥64 px). Con el daño oculto el
 * jugador solo ve nombre, tipo de ataque, ventaja de afinidad, costo y recarga, más lo que ya
 * aprendió probándolo ("débil · medio · fuerte"). Compartido por la mesa local y la sala online.
 */
export function AttackMenu({ opciones, memoria, ocultarDano, onAtacar, ocupado }: AttackMenuProps) {
  const mejor = ocultarDano ? -1 : opciones.findIndex((o) => o.disponible);
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map(({ habilidad: h, tier, disponible, cooldownRestante, danoEstimado }, i) => {
        const cat = CATEGORIA_INFO[h.categoria];
        const nivel = memoria[h.id];
        const hint = TIER_HINT[tier];
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => disponible && !ocupado && onAtacar(h.id)}
            disabled={!disponible || ocupado}
            aria-label={`${h.nombre}, ${cat.nombre}${nivel ? `, golpe ${ETIQUETA_NIVEL[nivel]}` : ", sin probar"}${disponible ? "" : ", no disponible"}`}
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
              {ocultarDano ? (
                <span className={cn("rounded-full px-1.5 py-px font-semibold", nivel ? CLASE_NIVEL[nivel] : "bg-panel text-foreground-muted")}>
                  {nivel ? ETIQUETA_NIVEL[nivel] : "❔ sin probar"}
                </span>
              ) : (
                <span className="rounded-full bg-reptile-green/15 px-1.5 py-px font-semibold text-reptile-green">≈{Math.round(danoEstimado)}</span>
              )}
              {!ocultarDano && i === mejor && <span className="font-bold text-state-ok">★ Mejor</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
