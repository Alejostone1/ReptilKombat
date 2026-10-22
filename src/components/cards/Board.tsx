"use client";

import type { Reptil } from "@/types/reptile";
import type { GameState, Lado } from "@/lib/card-game/types";
import { GameCard, type TonoImpacto } from "./GameCard";
import { AFFINITY_META } from "@/types/affinity";
import { bancaDe } from "@/lib/card-game/engine";
import { cn } from "@/lib/utils";

interface BoardProps {
  gameState: GameState;
  roster: Reptil[];
  sacudirLado: Lado | null;
  ultimaInvocacion: Lado | null;
  /** Reptil que acaba de caer a 0 HP: se muestra un instante en su estado "derrotada" antes de dejar el slot vacío. */
  ultimoDerrotado?: { lado: Lado; reptilId: string } | null;
  /** Último ataque, para animar: el atacante embiste y sobre `objetivo` flota `texto` (daño, curación, efecto). */
  ataque?: { id: number; atacante: Lado; objetivo: Lado; texto: string; tono: TonoImpacto } | null;
}

interface FichaBanca {
  reptilId: string;
  nombre: string;
  emoji: string;
  color: string;
  pct: number;
}

function LadoInfo({
  nombre,
  mazoRestante,
  cementerio,
  activo,
  banca,
  alDerecha,
}: {
  nombre: string;
  mazoRestante: number;
  cementerio: number;
  activo: boolean;
  banca: FichaBanca[];
  alDerecha?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", alDerecha && "items-end")}>
      <div className={cn("flex items-center gap-1.5 text-[11px] sm:text-xs", activo && "font-semibold text-reptile-green")}>
        <span className="truncate text-foreground">{nombre}</span>
        <span className="shrink-0 text-foreground-muted">🂠 {mazoRestante}</span>
        <span className="shrink-0 text-foreground-muted">💀 {cementerio}</span>
      </div>
      {banca.length > 0 && (
        <div className="flex gap-1" aria-label="Cartas en banca">
          {banca.map((f) => (
            <span
              key={f.reptilId}
              title={`${f.nombre} · ${Math.round(f.pct)}% de vida (en banca)`}
              className="flex flex-col items-center rounded-md border bg-panel px-1 py-0.5 text-[10px] leading-none"
              style={{ borderColor: f.color }}
            >
              {f.emoji}
              <span className="mt-0.5 block h-0.5 w-4 overflow-hidden rounded-full bg-panel-secondary">
                <span className={cn("block h-full", f.pct > 50 ? "bg-state-ok" : f.pct > 20 ? "bg-state-warn" : "bg-state-danger")} style={{ width: `${f.pct}%` }} />
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function fichasBanca(gameState: GameState, lado: Lado): FichaBanca[] {
  const j = lado === "A" ? gameState.jugadorA : gameState.jugadorB;
  return bancaDe(j).map((c) => {
    const stats = gameState.configuracion.reptiles[c.reptilId];
    const meta = stats ? AFFINITY_META[stats.afinidad] : null;
    return {
      reptilId: c.reptilId,
      nombre: stats?.nombre ?? "Reptil",
      emoji: meta?.emoji ?? "🦎",
      color: meta?.color ?? "#888",
      pct: stats ? Math.max(0, Math.min(100, (c.hpActual / stats.hp) * 100)) : 0,
    };
  });
}

const EMPTY_SLOT_CLASSES = "flex aspect-[3/4] w-[40vw] max-w-[10.5rem] items-center justify-center rounded-xl border-2 border-dashed border-border-subtle p-3 text-center text-xs text-foreground-muted sm:w-48 sm:max-w-none md:w-56";

export function Board({ gameState, roster, sacudirLado, ultimaInvocacion, ultimoDerrotado, ataque }: BoardProps) {
  const reptilA = gameState.jugadorA.activo ? roster.find((r) => r.id === gameState.jugadorA.activo!.reptilId) : null;
  const reptilB = gameState.jugadorB.activo ? roster.find((r) => r.id === gameState.jugadorB.activo!.reptilId) : null;
  const derrotadoA = !reptilA && ultimoDerrotado?.lado === "A" ? roster.find((r) => r.id === ultimoDerrotado.reptilId) : null;
  const derrotadoB = !reptilB && ultimoDerrotado?.lado === "B" ? roster.find((r) => r.id === ultimoDerrotado.reptilId) : null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-panel/60 p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <LadoInfo
          nombre={gameState.jugadorA.nombre}
          mazoRestante={gameState.jugadorA.mazo.length}
          cementerio={gameState.jugadorA.cementerio.length}
          activo={gameState.turno === "A"}
          banca={fichasBanca(gameState, "A")}
        />
        <LadoInfo
          nombre={gameState.jugadorB.nombre}
          mazoRestante={gameState.jugadorB.mazo.length}
          cementerio={gameState.jugadorB.cementerio.length}
          activo={gameState.turno === "B"}
          banca={fichasBanca(gameState, "B")}
          alDerecha
        />
      </div>

      <div className="flex items-center justify-center gap-2 py-2 sm:gap-6 sm:py-6 md:gap-16">
        <div className="flex flex-col items-center gap-2">
          {reptilA ? (
            <GameCard
              reptil={reptilA}
              hpActual={gameState.jugadorA.activo?.hpActual}
              energiaActual={gameState.jugadorA.activo?.energiaActual}
              energiaMax={gameState.configuracion.reptiles[reptilA.id]?.energiaMax}
              size="lg"
              sacudir={sacudirLado === "A"}
              animarEntrada={ultimaInvocacion === "A"}
              estados={gameState.jugadorA.activo?.estados}
              aturdidoTurnos={gameState.jugadorA.activo?.aturdidoTurnos}
              turnoActivo={gameState.turno === "A" && gameState.fase !== "terminado"}
              embestida={ataque?.atacante === "A" ? 1 : null}
              impacto={ataque?.objetivo === "A" ? { id: ataque.id, texto: ataque.texto, tono: ataque.tono } : null}
            />
          ) : derrotadoA ? (
            <GameCard reptil={derrotadoA} hpActual={0} size="lg" />
          ) : (
            <div className={EMPTY_SLOT_CLASSES}>Sin reptil activo</div>
          )}
        </div>

        <span className="text-lg font-black italic text-foreground-muted sm:text-2xl">VS</span>

        <div className="flex flex-col items-center gap-2">
          {reptilB ? (
            <GameCard
              reptil={reptilB}
              hpActual={gameState.jugadorB.activo?.hpActual}
              energiaActual={gameState.jugadorB.activo?.energiaActual}
              energiaMax={gameState.configuracion.reptiles[reptilB.id]?.energiaMax}
              size="lg"
              sacudir={sacudirLado === "B"}
              animarEntrada={ultimaInvocacion === "B"}
              estados={gameState.jugadorB.activo?.estados}
              aturdidoTurnos={gameState.jugadorB.activo?.aturdidoTurnos}
              turnoActivo={gameState.turno === "B" && gameState.fase !== "terminado"}
              embestida={ataque?.atacante === "B" ? -1 : null}
              impacto={ataque?.objetivo === "B" ? { id: ataque.id, texto: ataque.texto, tono: ataque.tono } : null}
            />
          ) : derrotadoB ? (
            <GameCard reptil={derrotadoB} hpActual={0} size="lg" />
          ) : (
            <div className={EMPTY_SLOT_CLASSES}>Sin reptil activo</div>
          )}
        </div>
      </div>
    </div>
  );
}
