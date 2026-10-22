"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameRoom } from "@/lib/hooks/useGameRoom";
import { puedeInvocar, puedeAtacar, puedeCambiar } from "@/lib/card-game/engine";
import { opcionesDeAtaque } from "@/lib/card-game/opciones-ataque";
import { ataqueParaTablero } from "@/lib/card-game/mensajes";
import { FEATURES } from "@/config/features";
import type { Lado } from "@/lib/card-game/types";
import { leerViewToken } from "@/lib/utils/session";
import { Board } from "@/components/cards/Board";
import { TurnBanner } from "@/components/cards/TurnBanner";
import { AttackAnimation } from "@/components/cards/AttackAnimation";
import { Countdown } from "@/components/cards/Countdown";
import { ConnectionBanner } from "@/components/cards/ConnectionBanner";
import { SwapSheet, ManoInvocar, candidatosDeCambio } from "@/components/cards/SwapSheet";
import { AttackMenu } from "@/components/cards/AttackMenu";
import { ActionDock } from "@/components/cards/ActionDock";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function SalaOnlinePage() {
  const params = useParams<{ codigo: string }>();
  const codigo = params.codigo.toUpperCase();
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const [viewToken, setViewToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // localStorage no existe en el render de servidor: el token solo puede leerse tras montar en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewToken(leerViewToken(codigo));
  }, [codigo]);

  const room = useGameRoom(codigo, viewToken ?? null);
  const [mostrarCountdown, setMostrarCountdown] = useState(false);
  const countdownMostrado = useRef(false);
  const [copiado, setCopiado] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    if (room.estadoSala === "IN_PROGRESS" && !countdownMostrado.current) {
      countdownMostrado.current = true;
      setMostrarCountdown(true);
    }
  }, [room.estadoSala]);

  // Solo en mi turno: lee del snapshot congelado de la partida (nunca del roster en vivo). Con
  // HIDE_ATTACK_DAMAGE no se calcula ni se muestra ningún número de daño antes de atacar.
  const opciones = useMemo(() => {
    if (!room.estado || !room.lado || room.estado.turno !== room.lado) return [];
    return opcionesDeAtaque(room.estado, abilities, config, FEATURES.HIDE_ATTACK_DAMAGE);
  }, [room.estado, room.lado, abilities, config]);

  // El tablero siempre dibuja MI carta a la izquierda ("A" en pantalla): si mi lado real es "B" se invierte.
  const ataqueTablero = useMemo(() => {
    if (!room.ultimoResultado || !room.ultimoAtaque || !room.lado) return null;
    const r = room.ultimoResultado;
    const t = ataqueParaTablero({ dano: r.danoEsperado, critico: r.critico, efecto: r.efectoAplicado }, room.ultimoAtaque.atacante, room.ultimoAtaque.id);
    if (room.lado === "A") return t;
    const voltear = (l: Lado): Lado => (l === "A" ? "B" : "A");
    return { ...t, atacante: voltear(t.atacante), objetivo: voltear(t.objetivo) };
  }, [room.ultimoResultado, room.ultimoAtaque, room.lado]);

  if (viewToken === undefined) return null;

  if (viewToken === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-foreground-muted">No tienes acceso a esta sala en este dispositivo.</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  if (room.error && !room.estado) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-state-danger">{room.error}</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  if (room.estadoSala === "CANCELLED") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-foreground-muted">Esta partida fue cancelada.</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  if (room.estadoSala === "WAITING") {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-2xl">⚔️ ARENA DE BATALLA</p>
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground-muted">Código de partida</p>
          <p className="text-5xl font-black tracking-[0.2em] text-reptile-green">{codigo}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard?.writeText(codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
        >
          {copiado ? "✓ Copiado" : "📋 Copiar código"}
        </Button>
        <div className="space-y-2">
          <p className="animate-pulse text-foreground-muted">Esperando oponente...</p>
          <p className="text-sm">
            <span className="text-state-ok">●</span> {room.nombrePropio} conectado
          </p>
          <p className="text-sm text-foreground-muted">
            <span>○</span> Esperando jugador
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/jugar")}>
          ← Volver al lobby
        </Button>
      </div>
    );
  }

  if (mostrarCountdown) {
    return (
      <>
        <p className="p-6 text-center text-lg font-bold text-reptile-green">¡Oponente encontrado!</p>
        <Countdown onFinish={() => setMostrarCountdown(false)} />
      </>
    );
  }

  if (!room.estado) return null;

  const nombreTurno = room.estado.turno === room.lado ? room.nombrePropio ?? "Tú" : room.nombreRival ?? "Rival";
  const esMiTurno = room.estado.turno === room.lado;
  const invocarDisponible = esMiTurno && puedeInvocar(room.estado);
  const atacarDisponible = esMiTurno && puedeAtacar(room.estado);
  const miJugador = room.lado === "A" ? room.estado.jugadorA : room.estado.jugadorB;
  const candidatos = candidatosDeCambio(miJugador, room.estado.configuracion, roster);

  function onAtacar(habilidadId: string) {
    room.atacar(habilidadId);
  }

  if (room.estadoSala === "FINISHED" && room.ganador) {
    const gane = room.ganador === room.lado;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <Card className={cn("p-8", gane ? "border-reptile-green/50 bg-reptile-green/10" : "border-state-danger/50 bg-state-danger/10")}>
          <p className="text-4xl">{gane ? "🏆" : "💀"}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{gane ? "VICTORIA" : "DERROTA"}</p>
          <p className="mt-1 text-sm text-foreground-muted">{gane ? "Has ganado la batalla" : "Tu ejército ha caído"}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => router.push("/jugar")}>Jugar de nuevo</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Volver al inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-3">
      <ConnectionBanner conexion={room.conexion} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">⚔️ Sala {codigo}</h1>
        <span className="text-xs text-foreground-muted">
          {room.nombrePropio} vs {room.nombreRival}
        </span>
      </div>

      <TurnBanner turno={room.estado.turno} numeroTurno={room.estado.numeroTurno} fase={room.estado.fase} nombreTurno={nombreTurno} />

      {/* Board siempre dibuja jugadorA a la izquierda: si mi lado real es "B", se
          intercambian los campos para que MI carta quede siempre del lado A en
          pantalla (con eso, sacudirLado="B" apunta siempre al rival, sin importar
          cuál sea mi lado real en la partida). */}
      <Board
        gameState={
          room.lado === "A"
            ? room.estado
            : { ...room.estado, jugadorA: room.estado.jugadorB, jugadorB: room.estado.jugadorA, turno: room.estado.turno === "A" ? "B" : "A" }
        }
        roster={roster}
        sacudirLado={ataqueTablero && ataqueTablero.tono !== "info" && ataqueTablero.objetivo !== ataqueTablero.atacante ? ataqueTablero.objetivo : null}
        ataque={ataqueTablero}
        ultimaInvocacion={null}
        ultimoDerrotado={
          room.ultimoDerrotado
            ? { lado: room.lado === "A" ? room.ultimoDerrotado.lado : room.ultimoDerrotado.lado === "A" ? "B" : "A", reptilId: room.ultimoDerrotado.reptilId }
            : null
        }
      />

      {room.estado.fase !== "terminado" && (invocarDisponible || atacarDisponible) && (
        <ActionDock titulo={invocarDisponible ? "Invoca tu carta" : "Elige tu ataque"}>
          {invocarDisponible && <ManoInvocar candidatos={candidatos} onElegir={(id) => room.invocar(id)} />}
          {atacarDisponible && <AttackMenu opciones={opciones} memoria={room.memoria} ocultarDano={FEATURES.HIDE_ATTACK_DAMAGE} onAtacar={onAtacar} />}
          {atacarDisponible && FEATURES.CARD_SWAP && puedeCambiar(room.estado) && (
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

      <SwapSheet
        abierto={cambiando}
        candidatos={candidatos}
        onElegir={(id) => {
          setCambiando(false);
          room.cambiar(id);
        }}
        onClose={() => setCambiando(false)}
      />

      {!esMiTurno && room.estado.fase !== "terminado" && (
        <p className="text-center text-sm text-foreground-muted">Esperando a {nombreTurno}...</p>
      )}

      <AttackAnimation
        resultado={room.ultimoResultado}
        habilidadNombre={room.ultimoResultado ? abilities.find((a) => a.id === room.ultimoResultado!.habilidadId)?.nombre : undefined}
        onComplete={room.limpiarUltimoResultado}
      />

      <div className="text-center">
        <Link href="/jugar" className="text-xs text-foreground-muted hover:text-reptile-green">
          ← Salir al lobby
        </Link>
      </div>
    </div>
  );
}
