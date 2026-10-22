"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSecuenciaCombate } from "@/lib/hooks/useSecuenciaCombate";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import { puedeInvocar, puedeAtacar, puedeCambiar, nombreDeHabilidad, configuracionARosterYHabilidades } from "@/lib/card-game/engine";
import { decidirAccionIA } from "@/lib/card-game/ai";
import { opcionesDeAtaque } from "@/lib/card-game/opciones-ataque";
import { ataqueParaTablero } from "@/lib/card-game/mensajes";
import { FEATURES } from "@/config/features";
import type { GameState, Lado } from "@/lib/card-game/types";
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
  const { state, ultimoResultado, ultimoDerrotado, ultimoAtaque, pantallaTransicion, modoIA, ladoIA, personalidadIA, invocar, atacar, cambiar, confirmarTurno, reiniciar, limpiarUltimoResultado } =
    useGameStore();
  const [ultimaInvocacion, setUltimaInvocacion] = useState<Lado | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const iaJugando = useRef(false);

  // Secuencia de combate: hasta el impacto se sigue mostrando el estado de ANTES (la vida no se adelanta).
  const ataqueEnCurso = useMemo(() => (ultimoAtaque ? { id: ultimoAtaque.id, estilo: ultimoAtaque.estilo, antes: ultimoAtaque.antes } : null), [ultimoAtaque]);
  const seq = useSecuenciaCombate<GameState>(ataqueEnCurso, state, limpiarUltimoResultado);
  const animando = seq.bloqueado;
  const vista = seq.estadoMostrado;

  // Turno de la IA: se salta la pantalla de "pasa el dispositivo" y juega sola tras una breve pausa.
  useEffect(() => {
    if (!modoIA || !ladoIA || !state || state.turno !== ladoIA || state.fase === "terminado") return;
    // La IA espera a que termine la animación del ataque anterior.
    if (animando) return;
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
        atacar(accion.habilidadId, roster, abilities, config);
      }
      iaJugando.current = false;
    }, 900);
    return () => {
      clearTimeout(t);
      iaJugando.current = false;
    };
  }, [modoIA, ladoIA, personalidadIA, state, pantallaTransicion, animando, roster, abilities, config, invocar, atacar, confirmarTurno]);

  // Opciones de ataque del turno. Con HIDE_ATTACK_DAMAGE no se calcula ni se muestra ningún número de daño.
  const opciones = useMemo(
    () => (state ? opcionesDeAtaque(state, config, FEATURES.HIDE_ATTACK_DAMAGE) : []),
    [state, config],
  );

  const ataqueTablero = useMemo(
    () =>
      ultimoResultado && ultimoAtaque
        ? {
            ...ataqueParaTablero(
              { dano: ultimoResultado.danoEsperado, critico: ultimoResultado.critico, esquivado: ultimoResultado.esquivado, efecto: ultimoResultado.efectoAplicado },
              ultimoAtaque.atacante,
              ultimoAtaque.id,
            ),
            estilo: ultimoAtaque.estilo,
          }
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
    // Un solo ataque a la vez: con una animación en curso los toques extra se ignoran.
    if (!state || animando) return;
    try {
      atacar(habilidadId, roster, abilities, config);
    } catch {
      /* el motor rechazó la jugada (usos agotados, turno ya cambiado…): no pasa nada, no se ejecuta dos veces */
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-2xl">🎮 Mesa de combate</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/jugar")}>
          ← Volver al lobby
        </Button>
      </div>

      <TurnBanner turno={(vista ?? state).turno} numeroTurno={(vista ?? state).numeroTurno} fase={(vista ?? state).fase} nombreTurno={(vista ?? state).turno === "A" ? (vista ?? state).jugadorA.nombre : (vista ?? state).jugadorB.nombre} />

      <Board
        gameState={vista ?? state}
        roster={roster}
        ultimaInvocacion={ultimaInvocacion}
        ultimoDerrotado={ultimoDerrotado}
        ataque={ataqueTablero ? { ...ataqueTablero, etapa: seq.etapa } : null}
      />

      {esTurnoDeLaIA && state.fase !== "terminado" && (
        <p className="animate-pulse text-center text-sm text-foreground-muted">🤖 {nombreTurno} está pensando...</p>
      )}

      {animando && (
        <div className="mt-auto rounded-xl border border-border-subtle bg-panel/70 py-3 text-center text-sm font-bold tracking-wide text-foreground-muted">⚔️ ¡Combate!</div>
      )}

      {!animando && !esTurnoDeLaIA && state.fase !== "terminado" && (
        <ActionDock titulo={invocarDisponible ? `Invoca una carta — ${nombreTurno}` : `Elige tu ataque — ${nombreTurno}`}>
          {invocarDisponible && <ManoInvocar candidatos={candidatos} onElegir={onInvocar} />}
          {atacarDisponible && <AttackMenu opciones={opciones} ocultarDano={FEATURES.HIDE_ATTACK_DAMAGE} onAtacar={onAtacar} />}
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

      {!animando && state.fase === "terminado" && (
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
        habilidadNombre={ultimoResultado ? nombreDeHabilidad(state.configuracion, ultimoResultado.habilidadId) : undefined}
        etapa={seq.etapa}
      />

      <AnimatePresence>
        {pantallaTransicion && !ultimoResultado && !animando && state.fase !== "terminado" && (
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
