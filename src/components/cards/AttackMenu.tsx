"use client";

import type { OpcionAtaque } from "@/lib/card-game/opciones-ataque";
import { USOS_MAXIMOS_HABILIDAD } from "@/lib/card-game/types";
import { CATEGORIA_INFO } from "@/lib/game-engine/categorias";
import { descripcionHabilidad } from "@/lib/game-engine/descripcion-habilidad";
import type { MatchupTier } from "@/types/affinity";
import { cn } from "@/lib/utils";

interface AttackMenuProps {
  opciones: OpcionAtaque[];
  /** HIDE_ATTACK_DAMAGE: nada que anticipe el resultado (ni daño, ni ventaja de tipo, ni "mejor opción"). Apagado = menú clásico con ≈daño y tipo. */
  ocultarDano: boolean;
  onAtacar: (habilidadId: string) => void;
  /** Bloquea toques mientras se resuelve una acción (animación de combate / envío al servidor): evita dobles ataques. */
  ocupado?: boolean;
}

const TIER_HINT: Record<MatchupTier, { emoji: string; texto: string; clase: string }> = {
  ventaja: { emoji: "🟢", texto: "Ventaja", clase: "text-state-ok" },
  desventaja: { emoji: "🔴", texto: "Desventaja", clase: "text-state-danger" },
  neutral: { emoji: "⚪", texto: "Neutral", clase: "text-foreground-muted" },
};

/** Cargas del ataque: una marca por uso que queda. Discretas, pero visibles de un vistazo. */
function Cargas({ restantes }: { restantes: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${restantes} de ${USOS_MAXIMOS_HABILIDAD} usos restantes`}>
      {Array.from({ length: USOS_MAXIMOS_HABILIDAD }, (_, i) => (
        <span key={i} aria-hidden className={cn("h-1.5 w-3 rounded-full transition-colors", i < restantes ? "bg-reptile-green" : "bg-foreground-muted/25")} />
      ))}
    </span>
  );
}

/**
 * Menú de ataques (celular primero: 2 columnas con zonas táctiles de ≥64 px). Cada ataque muestra su
 * nombre, una descripción temática breve, sus cargas restantes, el costo de energía y la recarga.
 * Con el daño oculto el juego NO adelanta nada del resultado: ni cuánto pega, ni si el tipo es ventajoso,
 * ni cuál conviene. Eso se descubre atacando. Compartido por la mesa local, la sala online y el 2 vs 2.
 */
export function AttackMenu({ opciones, ocultarDano, onAtacar, ocupado }: AttackMenuProps) {
  const mejor = ocultarDano ? -1 : opciones.findIndex((o) => o.disponible);
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map(({ habilidad: h, tier, disponible, cooldownRestante, danoEstimado, usosRestantes }, i) => {
        const cat = CATEGORIA_INFO[h.categoria];
        const hint = TIER_HINT[tier];
        const agotado = usosRestantes !== null && usosRestantes <= 0;
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => disponible && !ocupado && onAtacar(h.id)}
            disabled={!disponible || ocupado}
            aria-label={`${h.nombre}. ${descripcionHabilidad(h)}${usosRestantes !== null ? ` ${usosRestantes} usos restantes.` : ""}${agotado ? " Agotado." : ""}`}
            style={{ touchAction: "manipulation" }}
            className={cn(
              "flex min-h-[5.5rem] flex-col justify-between gap-1.5 rounded-xl border bg-panel-secondary px-2.5 py-2 text-left transition active:scale-[0.97]",
              disponible && !ocupado ? "hover:border-reptile-green/60" : "cursor-not-allowed",
              !disponible && "opacity-40",
              ocupado && disponible && "opacity-70",
              i === mejor ? "border-reptile-green/60" : "border-border-subtle",
            )}
          >
            <span className="space-y-0.5">
              <span className="flex items-start gap-1.5">
                <span className="text-base leading-none" aria-hidden>
                  {cat.icono}
                </span>
                <span className="line-clamp-2 text-[13px] font-bold leading-tight text-foreground">{h.nombre}</span>
              </span>
              <span className="line-clamp-3 block text-[11px] leading-snug text-foreground-muted">{descripcionHabilidad(h)}</span>
            </span>

            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
              {usosRestantes !== null && <Cargas restantes={usosRestantes} />}
              {h.costoEnergia > 0 && <span className="text-foreground-muted">⚡{h.costoEnergia}</span>}
              {cooldownRestante > 0 ? (
                <span className="font-semibold text-state-danger">⏱️ {cooldownRestante}</span>
              ) : null}
              {!ocultarDano && (
                <>
                  <span className={cn("font-semibold", hint.clase)}>
                    {hint.emoji} {hint.texto}
                  </span>
                  <span className="rounded-full bg-reptile-green/15 px-1.5 py-px font-semibold text-reptile-green">≈{Math.round(danoEstimado)}</span>
                  {i === mejor && <span className="font-bold text-state-ok">★ Mejor</span>}
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
