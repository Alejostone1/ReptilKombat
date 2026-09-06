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
    <div className={cn("flex items-center gap-2 text-xs", activo && "font-semibold text-reptile-green")}>
      <span className="text-foreground">{nombre}</span>
      <span className="text-foreground-muted">🂠 {mazoRestante}</span>
      <span className="text-foreground-muted">💀 {cementerio}</span>
    </div>
  );
}

export function Board({ gameState, roster, sacudirLado, ultimaInvocacion }: BoardProps) {
  const reptilA = gameState.jugadorA.activo ? roster.find((r) => r.id === gameState.jugadorA.activo!.reptilId) : null;
  const reptilB = gameState.jugadorB.activo ? roster.find((r) => r.id === gameState.jugadorB.activo!.reptilId) : null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-panel/60 p-6">
      <div className="mb-4 flex items-center justify-between">
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

      <div className="flex items-center justify-center gap-6 py-6 sm:gap-16">
        <div className="flex flex-col items-center gap-2">
          {reptilA ? (
            <GameCard
              reptil={reptilA}
              hpActual={gameState.jugadorA.activo?.hpActual}
              size="lg"
              sacudir={sacudirLado === "A"}
              animarEntrada={ultimaInvocacion === "A"}
            />
          ) : (
            <div className="flex h-72 w-56 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle text-xs text-foreground-muted">
              Sin reptil activo
            </div>
          )}
        </div>

        <span className="text-2xl font-black text-foreground-muted">VS</span>

        <div className="flex flex-col items-center gap-2">
          {reptilB ? (
            <GameCard
              reptil={reptilB}
              hpActual={gameState.jugadorB.activo?.hpActual}
              size="lg"
              sacudir={sacudirLado === "B"}
              animarEntrada={ultimaInvocacion === "B"}
            />
          ) : (
            <div className="flex h-72 w-56 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle text-xs text-foreground-muted">
              Sin reptil activo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
