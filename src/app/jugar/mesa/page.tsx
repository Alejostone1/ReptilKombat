"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import { puedeInvocar, puedeAtacar, habilidadesDisponibles } from "@/lib/card-game/engine";
import type { Lado } from "@/lib/card-game/types";
import { Board } from "@/components/cards/Board";
import { TurnBanner } from "@/components/cards/TurnBanner";
import { AttackAnimation } from "@/components/cards/AttackAnimation";
import { GameCard } from "@/components/cards/GameCard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function MesaPage() {
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const { state, ultimoResultado, pantallaTransicion, invocar, atacar, confirmarTurno, reiniciar } = useGameStore();
  const [sacudirLado, setSacudirLado] = useState<Lado | null>(null);
  const [ultimaInvocacion, setUltimaInvocacion] = useState<Lado | null>(null);

  const habilidadesTurno = useMemo(() => (state ? habilidadesDisponibles(state, abilities) : []), [state, abilities]);

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
                {habilidadesTurno.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onAtacar(h.id)}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-panel-secondary px-4 py-3 text-left transition-colors hover:border-reptile-green/60"
                  >
                    <span>
                      <span className="block font-semibold text-foreground">{h.nombre}</span>
                      <span className="block text-xs text-foreground-muted">{h.efecto}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1 text-xs">
                      <Badge tone="accent">Pot. {h.potencia}</Badge>
                      <Badge>Prec. {h.precision}%</Badge>
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
