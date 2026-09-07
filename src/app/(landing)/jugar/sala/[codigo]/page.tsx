"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameRoom } from "@/lib/hooks/useGameRoom";
import { puedeInvocar, puedeAtacar, habilidadesDisponibles, puedeUsarHabilidad, reptilDesdeStats, multiplicadorEstado } from "@/lib/card-game/engine";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { MatchupTier } from "@/types/affinity";
import { leerViewToken } from "@/lib/utils/session";
import { Board } from "@/components/cards/Board";
import { TurnBanner } from "@/components/cards/TurnBanner";
import { AttackAnimation } from "@/components/cards/AttackAnimation";
import { Countdown } from "@/components/cards/Countdown";
import { ConnectionBanner } from "@/components/cards/ConnectionBanner";
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
  const [sacudir, setSacudir] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (room.estadoSala === "IN_PROGRESS" && !countdownMostrado.current) {
      countdownMostrado.current = true;
      setMostrarCountdown(true);
    }
  }, [room.estadoSala]);

  const habilidadesTurno = useMemo(
    () => (room.estado ? habilidadesDisponibles(room.estado, abilities) : []),
    [room.estado, abilities],
  );

  // Igual que en mesa/page.tsx: lee siempre del snapshot congelado en room.estado.configuracion,
  // nunca del roster en vivo, para que la preview jamás se desincronice de lo que el servidor aplique.
  const previews = useMemo(() => {
    if (!room.estado || !room.lado || room.estado.turno !== room.lado) return [];
    const propio = room.lado === "A" ? room.estado.jugadorA : room.estado.jugadorB;
    const rival = room.lado === "A" ? room.estado.jugadorB : room.estado.jugadorA;
    const atacanteStats = propio.activo ? room.estado.configuracion.reptiles[propio.activo.reptilId] : null;
    const defensorStats = rival.activo ? room.estado.configuracion.reptiles[rival.activo.reptilId] : null;
    if (!atacanteStats || !defensorStats || !propio.activo || !rival.activo) return [];

    const atacante = reptilDesdeStats(atacanteStats, { atk: Math.round(atacanteStats.atk * multiplicadorEstado(propio.activo, "atk")) });
    const defensor = reptilDesdeStats(defensorStats, {
      hp: rival.activo.hpActual,
      def: Math.round(defensorStats.def * multiplicadorEstado(rival.activo, "def")),
    });
    const tier = getAffinityTier(atacanteStats.afinidad, defensorStats.afinidad);
    return habilidadesTurno
      .map((h) => ({
        habilidad: h,
        tier,
        resultado: calculateDamage(atacante, defensor, h, config),
        disponible: puedeUsarHabilidad(propio.activo!, h),
        cooldownRestante: propio.activo!.cooldowns[h.id] ?? 0,
      }))
      .sort((a, b) => Number(b.disponible) - Number(a.disponible) || b.resultado.danoEsperado - a.resultado.danoEsperado);
  }, [room.estado, room.lado, habilidadesTurno, config]);

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

  function onAtacar(habilidadId: string, disponible: boolean) {
    if (!disponible) return;
    setSacudir(true);
    room.atacar(habilidadId);
    setTimeout(() => setSacudir(false), 500);
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
    <div className="space-y-6 px-4 py-6">
      <ConnectionBanner conexion={room.conexion} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">⚔️ Sala {codigo}</h1>
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
        sacudirLado={sacudir ? "B" : null}
        ultimaInvocacion={null}
        ultimoDerrotado={
          room.ultimoDerrotado
            ? { lado: room.lado === "A" ? room.ultimoDerrotado.lado : room.ultimoDerrotado.lado === "A" ? "B" : "A", reptilId: room.ultimoDerrotado.reptilId }
            : null
        }
      />

      {room.estado.fase !== "terminado" && (invocarDisponible || atacarDisponible) && (
        <Card>
          <CardHeader>
            <CardTitle>{invocarDisponible ? "Invocar tu carta" : "Elige tu ataque"}</CardTitle>
          </CardHeader>
          <CardContent>
            {invocarDisponible && (
              <div className="flex flex-wrap justify-center gap-3">
                {miJugador.mazo.map((id) => {
                  const reptil = roster.find((r) => r.id === id);
                  if (!reptil) return null;
                  return <GameCard key={id} reptil={reptil} size="sm" seleccionable onClick={() => room.invocar(id)} />;
                })}
              </div>
            )}
            {atacarDisponible && (
              <div className="grid gap-2 sm:grid-cols-2">
                {previews.map(({ habilidad: h, tier, resultado, disponible, cooldownRestante }, i) => (
                  <button
                    key={h.id}
                    onClick={() => onAtacar(h.id, disponible)}
                    disabled={!disponible}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border bg-panel-secondary px-3 py-3 text-left transition-colors",
                      disponible ? "hover:border-reptile-green/60" : "cursor-not-allowed opacity-40",
                      i === 0 && disponible ? "border-reptile-green/50" : "border-border-subtle",
                      "sm:flex-row sm:items-center sm:justify-between",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground">{h.nombre}</span>
                        {i === 0 && disponible && <Badge tone="ok">★ Mejor opción</Badge>}
                      </span>
                      <span className="block text-xs text-foreground-muted">{h.efecto}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs sm:flex-col sm:items-end">
                      <Badge tone={TIER_INFO[tier].tone}>{TIER_INFO[tier].label}</Badge>
                      <Badge tone="accent">≈{Math.round(resultado.danoEsperado)} daño</Badge>
                      {h.costoEnergia > 0 && <Badge>⚡{h.costoEnergia}</Badge>}
                      {cooldownRestante > 0 ? (
                        <Badge tone="danger">⏱️ {cooldownRestante}</Badge>
                      ) : h.cooldownTurnos > 0 ? (
                        <Badge tone="ok">✅ Lista</Badge>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!esMiTurno && room.estado.fase !== "terminado" && (
        <p className="text-center text-sm text-foreground-muted">Esperando a {nombreTurno}...</p>
      )}

      <AttackAnimation
        resultado={room.ultimoResultado}
        habilidadNombre={room.ultimoResultado ? abilities.find((a) => a.id === room.ultimoResultado!.habilidadId)?.nombre : undefined}
        onComplete={room.limpiarUltimoDerrotado}
      />

      <div className="text-center">
        <Link href="/jugar" className="text-xs text-foreground-muted hover:text-reptile-green">
          ← Salir al lobby
        </Link>
      </div>
    </div>
  );
}
