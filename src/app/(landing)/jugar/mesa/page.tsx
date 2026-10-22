"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import { puedeInvocar, puedeAtacar, puedeCambiar, configuracionARosterYHabilidades } from "@/lib/card-game/engine";
import { decidirAccionIA } from "@/lib/card-game/ai";
import { opcionesDeAtaque } from "@/lib/card-game/opciones-ataque";
import { ataqueParaTablero } from "@/lib/card-game/mensajes";
import { FEATURES } from "@/config/features";
import type { Lado } from "@/lib/card-game/types";
import { Board } from "@/components/cards/Board";
import { TurnBanner } from "@/components/cards/TurnBanner";
import { AttackAnimation } from "@/components/cards/AttackAnimation";
import { AttackMenu } from "@/components/cards/AttackMenu";
import { ActionDock } from "@/components/cards/ActionDock";
import { SwapSheet, ManoInvocar, candidatosDeCambio } from "@/components/cards/SwapSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function MesaPage() {
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const { state, ultimoResultado, ultimoDerrotado, ultimoAtaque, memoria, pantallaTransicion, modoIA, ladoIA, personalidadIA, invocar, atacar, cambiar, confirmarTurno, reiniciar } =
    useGameStore();
  const [sacudirLado, setSacudirLado] = useState<Lado | null>(null);
  const [ultimaInvocacion, setUltimaInvocacion] = useState<Lado | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const iaJugando = useRef(false);

  // Turno de la IA: se salta la pantalla de "pasa el dispositivo" y juega sola tras una breve pausa.
  useEffect(() => {
    if (!modoIA || !ladoIA || !state || state.turno !== ladoIA || state.fase === "terminado") return;
    if (pantallaTransicion) {
      confirmarTurno();
      return;
    }
    if (iaJugando.current) return;
    iaJugando.current = true;
    const t = setTimeout(() => {
      // La IA decide siempre con el snapshot congelado de la partida, nunca con el roster en vivo.
      const { roster: rosterSnapshot, abilities: abilitiesSnapshot } = configuracionARosterYHabilidades(state.configuracion);
      const accion = decidirAccionIA(state, rosterSnapshot, abilitiesSnapshot, config, ladoIA, personalidadIA);
      if (accion?.tipo === "invocar") {
        invocar(accion.reptilId, roster);
        setUltimaInvocacion(ladoIA);
        setTimeout(() => setUltimaInvocacion(null), 700);
      } else if (accion?.tipo === "atacar") {
        const ladoDefensor: Lado = ladoIA === "A" ? "B" : "A";
        atacar(accion.habilidadId, roster, abilities, config);
        setSacudirLado(ladoDefensor);
        setTimeout(() => setSacudirLado(null), 500);
      }
      iaJugando.current = false;
    }, 900);
    return () => clearTimeout(t);
  }, [modoIA, ladoIA, personalidadIA, state, pantallaTransicion, roster, abilities, config, invocar, atacar, confirmarTurno]);

  // Opciones de ataque del turno. Con HIDE_ATTACK_DAMAGE no se calcula ni se muestra ningún número de daño.
  const opciones = useMemo(
    () => (state ? opcionesDeAtaque(state, abilities, config, FEATURES.HIDE_ATTACK_DAMAGE) : []),
    [state, abilities, config],
  );

  const ataqueTablero = useMemo(
    () =>
      ultimoResultado && ultimoAtaque
        ? ataqueParaTablero(
            { dano: ultimoResultado.danoEsperado, critico: ultimoResultado.critico, efecto: ultimoResultado.efectoAplicado },
            ultimoAtaque.atacante,
            ultimoAtaque.id,
          )
        : null,
    [ultimoResultado, ultimoAtaque],
  );

  if (!state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-foreground-muted">No hay una partida en curso.</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  const nombreTurno = state.turno === "A" ? state.jugadorA.nombre : state.jugadorB.nombre;
  const esTurnoDeLaIA = modoIA && state.turno === ladoIA;
  const invocarDisponible = !esTurnoDeLaIA && puedeInvocar(state);
  const atacarDisponible = !esTurnoDeLaIA && puedeAtacar(state);
  const jugadorEnTurno = state.turno === "A" ? state.jugadorA : state.jugadorB;
  const candidatos = candidatosDeCambio(jugadorEnTurno, state.configuracion, roster);
  const puedeCambiarCarta = FEATURES.CARD_SWAP && puedeCambiar(state);

  function onCambiar(reptilId: string) {
    setCambiando(false);
    cambiar(reptilId, roster);
    setUltimaInvocacion(state?.turno ?? null);
    setTimeout(() => setUltimaInvocacion(null), 700);
  }

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
    <div className="flex min-h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-2xl">🎮 Mesa de combate</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/jugar")}>
          ← Volver al lobby
        </Button>
      </div>

      <TurnBanner turno={state.turno} numeroTurno={state.numeroTurno} fase={state.fase} nombreTurno={nombreTurno} />

      <Board
        gameState={state}
        roster={roster}
        sacudirLado={sacudirLado}
        ultimaInvocacion={ultimaInvocacion}
        ultimoDerrotado={ultimoDerrotado}
        ataque={ataqueTablero}
      />

      {esTurnoDeLaIA && state.fase !== "terminado" && (
        <p className="animate-pulse text-center text-sm text-foreground-muted">🤖 {nombreTurno} está pensando...</p>
      )}

      {!esTurnoDeLaIA && state.fase !== "terminado" && (
        <ActionDock titulo={invocarDisponible ? `Invoca una carta — ${nombreTurno}` : `Elige tu ataque — ${nombreTurno}`}>
          {invocarDisponible && <ManoInvocar candidatos={candidatos} onElegir={onInvocar} />}
          {atacarDisponible && <AttackMenu opciones={opciones} memoria={memoria} ocultarDano={FEATURES.HIDE_ATTACK_DAMAGE} onAtacar={onAtacar} />}
          {atacarDisponible && puedeCambiarCarta && (
            <button
              type="button"
              onClick={() => setCambiando(true)}
              style={{ touchAction: "manipulation" }}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-panel-secondary text-sm font-bold text-foreground transition active:scale-[0.98]"
            >
              🔄 Cambiar carta <span className="text-xs font-normal text-foreground-muted">(gasta el turno)</span>
            </button>
          )}
        </ActionDock>
      )}

      <SwapSheet abierto={cambiando} candidatos={candidatos} onElegir={onCambiar} onClose={() => setCambiando(false)} />

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
        onComplete={() => useGameStore.setState({ ultimoResultado: null, ultimoDerrotado: null })}
      />

      <AnimatePresence>
        {pantallaTransicion && !ultimoResultado && state.fase !== "terminado" && (
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
