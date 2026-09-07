"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import { puedeInvocar, puedeAtacar, habilidadesDisponibles } from "@/lib/card-game/engine";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { MatchupTier } from "@/types/affinity";
import type { Lado } from "@/lib/card-game/types";
import { Board } from "@/components/cards/Board";
import { TurnBanner } from "@/components/cards/TurnBanner";
import { AttackAnimation } from "@/components/cards/AttackAnimation";
import { GameCard } from "@/components/cards/GameCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const TIER_INFO: Record<MatchupTier, { label: string; tone: "ok" | "danger" | "neutral" }> = {
  ventaja: { label: "🟢 Ventaja", tone: "ok" },
  desventaja: { label: "🔴 Desventaja", tone: "danger" },
  neutral: { label: "⚪ Neutral", tone: "neutral" },
};

export default function MesaPage() {
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const { state, ultimoResultado, pantallaTransicion, invocar, atacar, confirmarTurno, reiniciar } = useGameStore();
  const [sacudirLado, setSacudirLado] = useState<Lado | null>(null);
  const [ultimaInvocacion, setUltimaInvocacion] = useState<Lado | null>(null);

  const habilidadesTurno = useMemo(() => (state ? habilidadesDisponibles(state, abilities) : []), [state, abilities]);

  // Vista previa de daño/efectividad por habilidad, para saber cuál conviene usar antes de atacar.
  const previews = useMemo(() => {
    if (!state) return [];
    const ladoAtacante = state.turno;
    const ladoDefensor: Lado = ladoAtacante === "A" ? "B" : "A";
    const jugadorAtacante = ladoAtacante === "A" ? state.jugadorA : state.jugadorB;
    const jugadorDefensor = ladoDefensor === "A" ? state.jugadorA : state.jugadorB;
    const atacante = jugadorAtacante.activo ? roster.find((r) => r.id === jugadorAtacante.activo!.reptilId) : null;
    const defensorBase = jugadorDefensor.activo ? roster.find((r) => r.id === jugadorDefensor.activo!.reptilId) : null;
    if (!atacante || !defensorBase || !jugadorDefensor.activo) return [];

    const defensorConHp = { ...defensorBase, hp: jugadorDefensor.activo.hpActual };
    const tier = getAffinityTier(atacante.afinidad, defensorBase.afinidad);
    const resultados = habilidadesTurno.map((h) => ({
      habilidad: h,
      tier,
      resultado: calculateDamage(atacante, defensorConHp, h, config),
    }));
    return resultados.sort((a, b) => b.resultado.danoEsperado - a.resultado.danoEsperado);
  }, [state, roster, habilidadesTurno, config]);

  if (!state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-foreground-muted">No hay una partida en curso.</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  const nombreTurno = state.turno === "A" ? state.jugadorA.nombre : state.jugadorB.nombre;
  const invocarDisponible = puedeInvocar(state);
  const atacarDisponible = puedeAtacar(state);
  const manoTurno = state.turno === "A" ? state.jugadorA.mazo : state.jugadorB.mazo;

  function onInvocar(reptilId: string) {
    if (!state) return;
    const lado = state.turno;
    invocar(reptilId, roster);
    setUltimaInvocacion(lado);
    setTimeout(() => setUltimaInvocacion(null), 700);
  }

  function onAtacar(habilidadId: string) {
    if (!state) return;
    const ladoDefensor: Lado = state.turno === "A" ? "B" : "A";
    atacar(habilidadId, roster, abilities, config);
    setSacudirLado(ladoDefensor);
    setTimeout(() => setSacudirLado(null), 500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🎮 Mesa de combate</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/jugar")}>
          ← Volver al lobby
        </Button>
      </div>

      <TurnBanner turno={state.turno} numeroTurno={state.numeroTurno} fase={state.fase} nombreTurno={nombreTurno} />

      <Board gameState={state} roster={roster} sacudirLado={sacudirLado} ultimaInvocacion={ultimaInvocacion} />

      {state.fase !== "terminado" && (
        <Card>
          <CardHeader>
            <CardTitle>{invocarDisponible ? `Invocar — turno de ${nombreTurno}` : `Atacar — turno de ${nombreTurno}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {invocarDisponible && (
              <div className="flex flex-wrap justify-center gap-3">
                {manoTurno.map((id) => {
                  const reptil = roster.find((r) => r.id === id);
                  if (!reptil) return null;
                  return <GameCard key={id} reptil={reptil} size="sm" seleccionable onClick={() => onInvocar(id)} />;
                })}
              </div>
            )}
            {atacarDisponible && (
              <div className="grid gap-2 sm:grid-cols-2">
                {previews.map(({ habilidad: h, tier, resultado }, i) => (
                  <button
                    key={h.id}
                    onClick={() => onAtacar(h.id)}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border bg-panel-secondary px-3 py-3 text-left transition-colors hover:border-reptile-green/60 sm:flex-row sm:items-center sm:justify-between",
                      i === 0 ? "border-reptile-green/50" : "border-border-subtle",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground">{h.nombre}</span>
                        {i === 0 && <Badge tone="ok">★ Mejor opción</Badge>}
                      </span>
                      <span className="block text-xs text-foreground-muted">{h.efecto}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs sm:flex-col sm:items-end">
                      <Badge tone={TIER_INFO[tier].tone}>{TIER_INFO[tier].label}</Badge>
                      <Badge tone="accent">≈{Math.round(resultado.danoEsperado)} daño</Badge>
                      <Badge>{resultado.porcentajeHP.toFixed(0)}% HP</Badge>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.fase === "terminado" && (
        <Card className="border-reptile-green/50 bg-reptile-green/10 p-8 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 text-xl font-bold text-foreground">
            {state.ganador === "A" ? state.jugadorA.nombre : state.jugadorB.nombre} gana la partida
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              reiniciar();
              router.push("/jugar");
            }}
          >
            Jugar otra vez
          </Button>
        </Card>
      )}

      <AttackAnimation
        resultado={ultimoResultado}
        habilidadNombre={ultimoResultado ? abilities.find((a) => a.id === ultimoResultado.habilidadId)?.nombre : undefined}
        onComplete={() => useGameStore.setState({ ultimoResultado: null })}
      />

      <AnimatePresence>
        {pantallaTransicion && state.fase !== "terminado" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm"
          >
            <span className="text-5xl">🔄</span>
            <p className="text-lg text-foreground-muted">Pasa el dispositivo a</p>
            <p className="text-2xl font-bold text-foreground">{nombreTurno}</p>
            <Button onClick={confirmarTurno}>Listo, es mi turno</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
