"use client";

import type { Reptil } from "@/types/reptile";
import type { GameState, Lado } from "@/lib/card-game/types";
import { GameCard } from "./GameCard";
import { cn } from "@/lib/utils";

interface BoardProps {
  gameState: GameState;
  roster: Reptil[];
  sacudirLado: Lado | null;
  ultimaInvocacion: Lado | null;
  /** Reptil que acaba de caer a 0 HP: se muestra un instante en su estado "derrotada" antes de dejar el slot vacío. */
  ultimoDerrotado?: { lado: Lado; reptilId: string } | null;
}

function LadoInfo({
  nombre,
  mazoRestante,
  cementerio,
  activo,
}: {
  nombre: string;
  mazoRestante: number;
  cementerio: number;
  activo: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] sm:text-xs", activo && "font-semibold text-reptile-green")}>
      <span className="truncate text-foreground">{nombre}</span>
      <span className="shrink-0 text-foreground-muted">🂠 {mazoRestante}</span>
      <span className="shrink-0 text-foreground-muted">💀 {cementerio}</span>
    </div>
  );
}

const EMPTY_SLOT_CLASSES = "flex aspect-[3/4] w-36 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle p-3 text-center text-xs text-foreground-muted sm:w-48 md:w-56";

export function Board({ gameState, roster, sacudirLado, ultimaInvocacion, ultimoDerrotado }: BoardProps) {
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
        />
        <LadoInfo
          nombre={gameState.jugadorB.nombre}
          mazoRestante={gameState.jugadorB.mazo.length}
          cementerio={gameState.jugadorB.cementerio.length}
          activo={gameState.turno === "B"}
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-3 py-3 sm:flex-row sm:gap-6 sm:py-6 md:gap-16">
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
            />
          ) : derrotadoA ? (
            <GameCard reptil={derrotadoA} hpActual={0} size="lg" />
          ) : (
            <div className={EMPTY_SLOT_CLASSES}>Sin reptil activo</div>
          )}
        </div>

        <span className="text-xl font-black text-foreground-muted sm:text-2xl">VS</span>

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
