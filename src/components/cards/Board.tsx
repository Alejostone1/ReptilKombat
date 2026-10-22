"use client";

import type { Reptil } from "@/types/reptile";
import type { GameState, Lado } from "@/lib/card-game/types";
import { motion, useReducedMotion } from "framer-motion";
import { GameCard, type TonoImpacto } from "./GameCard";
import type { FxCarta } from "./pose-combate";
import { resultadoRevelado, type Etapa, type EstiloAtaque } from "@/lib/card-game/estilo-ataque";
import { AFFINITY_META } from "@/types/affinity";
import { bancaDe } from "@/lib/card-game/engine";
import { cn } from "@/lib/utils";

interface BoardProps {
  gameState: GameState;
  roster: Reptil[];
  ultimaInvocacion: Lado | null;
  /** Reptil que acaba de caer a 0 HP: se muestra un instante en su estado "derrotada" antes de dejar el slot vacío. */
  ultimoDerrotado?: { lado: Lado; reptilId: string } | null;
  /**
   * Ataque en curso, para animar: quién ataca, sobre quién cae, en qué etapa de la secuencia va, con qué estilo
   * (tipo del animal, peso) y el texto que flota (daño, curación, efecto) — que solo se muestra desde el impacto.
   */
  ataque?: { id: number; atacante: Lado; objetivo: Lado; texto: string; tono: TonoImpacto; esquivado?: boolean; etapa: Etapa | null; estilo: EstiloAtaque } | null;
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

export function Board({ gameState, roster, ultimaInvocacion, ultimoDerrotado, ataque }: BoardProps) {
  const reducirMovimiento = useReducedMotion();
  const etapa = ataque?.etapa ?? null;
  const revelado = resultadoRevelado(etapa);

  /** Animación de combate que le toca a la carta de cada lado (null = sin ataque en curso). */
  function fxDe(lado: Lado): FxCarta | null {
    if (!ataque || !etapa) return null;
    const esAtacante = ataque.atacante === lado;
    const esObjetivo = ataque.objetivo === lado;
    if (!esAtacante && !esObjetivo) return null;
    return {
      id: ataque.id,
      etapa,
      rol: esAtacante && esObjetivo ? "ambos" : esAtacante ? "atacante" : "objetivo",
      dx: ataque.atacante === "A" ? 1 : -1,
      dy: 0,
      estilo: ataque.estilo,
      esquivado: ataque.esquivado,
    };
  }

  // El número de daño y la vida nueva solo se muestran desde el impacto.
  const impactoDe = (lado: Lado) => (ataque && revelado && etapa && ataque.objetivo === lado ? { id: ataque.id, texto: ataque.texto, tono: ataque.tono } : null);

  function carta(lado: Lado) {
    const j = lado === "A" ? gameState.jugadorA : gameState.jugadorB;
    const reptil = j.activo ? roster.find((r) => r.id === j.activo!.reptilId) : null;
    const caido = !reptil && ultimoDerrotado?.lado === lado ? roster.find((r) => r.id === ultimoDerrotado.reptilId) : null;
    if (reptil) {
      return (
        <GameCard
          reptil={reptil}
          hpActual={j.activo?.hpActual}
          energiaActual={j.activo?.energiaActual}
          energiaMax={gameState.configuracion.reptiles[reptil.id]?.energiaMax}
          size="lg"
          animarEntrada={ultimaInvocacion === lado}
          estados={j.activo?.estados}
          aturdidoTurnos={j.activo?.aturdidoTurnos}
          turnoActivo={gameState.turno === lado && gameState.fase !== "terminado"}
          fx={fxDe(lado)}
          impacto={impactoDe(lado)}
        />
      );
    }
    if (caido) return <GameCard reptil={caido} hpActual={0} size="lg" fx={fxDe(lado)} impacto={impactoDe(lado)} />;
    return <div className={EMPTY_SLOT_CLASSES}>Sin reptil activo</div>;
  }

  // Temblor de cámara en el impacto: todo el tablero se sacude según el peso del golpe.
  const t = ataque && etapa === "impacto" && !reducirMovimiento ? ataque.estilo.temblor : 0;

  return (
    <motion.div
      className="relative rounded-2xl border border-border-subtle bg-panel/60 p-3 sm:p-6"
      animate={t ? { x: [0, -t, t, -t * 0.6, t * 0.6, -t * 0.25, 0], y: [0, t * 0.3, -t * 0.3, 0] } : { x: 0, y: 0 }}
      transition={{ duration: t ? ataque!.estilo.duraciones.impacto / 1000 : 0.2, ease: "easeOut" }}
    >
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

      <div className="relative flex items-center justify-center gap-2 py-2 sm:gap-6 sm:py-6 md:gap-16">
        <div className="flex flex-col items-center gap-2">{carta("A")}</div>

        <span className="text-lg font-black italic text-foreground-muted sm:text-2xl">VS</span>

        <div className="flex flex-col items-center gap-2">{carta("B")}</div>

        {/* Esfera de energía de los ataques especiales: viaja del atacante al rival durante la ejecución. */}
        {ataque && etapa === "ejecucion" && ataque.estilo.trayecto === "proyectil" && ataque.atacante !== ataque.objetivo && (
          <motion.span
            key={`orbe-${ataque.id}`}
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-30 -mt-4 h-8 w-8 rounded-full"
            style={{
              background: `radial-gradient(circle, #fff 0%, ${ataque.estilo.color} 55%, transparent 72%)`,
              boxShadow: `0 0 20px 6px ${ataque.estilo.color}`,
            }}
            initial={{ left: ataque.atacante === "A" ? "26%" : "74%", scale: 0.5, opacity: 0.4 }}
            animate={{ left: ataque.atacante === "A" ? "74%" : "26%", scale: [0.5, 1.2, 1], opacity: 1 }}
            transition={{ duration: ataque.estilo.duraciones.ejecucion / 1000, ease: [0.4, 0, 1, 0.7] }}
          />
        )}
      </div>
    </motion.div>
  );
}
