"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameRoomEquipos } from "@/lib/hooks/useGameRoomEquipos";
import {
  companeroDe,
  equipoDe,
  objetivosValidos,
  puedeAtacarEquipos,
  puedeCambiarEquipos,
  puedeInvocarEquipos,
  rivalesDe,
  type EstadoEquipos,
} from "@/lib/card-game/engine-equipos";
import { opcionesContra } from "@/lib/card-game/opciones-ataque";
import { impactoFlotante } from "@/lib/card-game/mensajes";
import { resultadoRevelado, type Etapa, type EstiloAtaque } from "@/lib/card-game/estilo-ataque";
import type { FxCarta } from "./pose-combate";
import { bancaDe, nombreDeHabilidad } from "@/lib/card-game/engine";
import { useSecuenciaCombate } from "@/lib/hooks/useSecuenciaCombate";
import { FEATURES } from "@/config/features";
import { AFFINITY_META } from "@/types/affinity";
import { urlDeSala } from "@/lib/utils/sala-qr";
import { GameCard } from "./GameCard";
import { AttackAnimation } from "./AttackAnimation";
import { AttackMenu } from "./AttackMenu";
import { ActionDock } from "./ActionDock";
import { Countdown } from "./Countdown";
import { ConnectionBanner } from "./ConnectionBanner";
import { RivalDesconectadoBanner } from "./RivalDesconectadoBanner";
import { SwapSheet, ManoInvocar, candidatosDeCambio } from "./SwapSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Reptil } from "@/types/reptile";

const NOMBRE_ROL = (miIdx: number, idx: number) => (idx === miIdx ? "Tú" : idx === companeroDe(miIdx) ? "Compañero" : "Rival");

interface AsientoProps {
  estado: EstadoEquipos;
  idx: number;
  miIdx: number;
  roster: Reptil[];
  esObjetivo: boolean;
  puedeElegir: boolean;
  onElegir: () => void;
  ataque: {
    atacanteIdx: number;
    objetivoIdx: number;
    id: number;
    texto: string;
    tono: "dano" | "critico" | "curacion" | "info";
    sobre: "rival" | "atacante";
    estilo: EstiloAtaque;
    etapa: Etapa | null;
    esquivado?: boolean;
  } | null;
  derrotado: { idx: number; reptilId: string } | null;
}

function Asiento({ estado, idx, miIdx, roster, esObjetivo, puedeElegir, onElegir, ataque, derrotado }: AsientoProps) {
  const j = estado.jugadores[idx];
  const activo = j.activo;
  const reptil = activo ? roster.find((r) => r.id === activo.reptilId) : null;
  const caido = !reptil && derrotado?.idx === idx ? roster.find((r) => r.id === derrotado.reptilId) : null;
  const esTurno = estado.turnoIdx === idx && estado.fase !== "terminado";
  const equipo = equipoDe(idx);
  const banca = bancaDe(j);
  // El número flota sobre quien lo recibe (el objetivo en un golpe; el propio atacante en curación/mejora) y
  // solo desde el impacto: antes no se revela nada del resultado.
  const revelado = !!ataque && resultadoRevelado(ataque.etapa);
  const impacto =
    ataque && revelado && ataque.etapa && (ataque.sobre === "rival" ? ataque.objetivoIdx === idx : ataque.atacanteIdx === idx) ? { id: ataque.id, texto: ataque.texto, tono: ataque.tono } : null;
  // Animación de combate de este asiento: mi equipo está abajo, así que ataca hacia arriba y recibe desde arriba.
  const esAtacante = ataque?.atacanteIdx === idx;
  const esObjetivoFx = ataque?.sobre === "rival" ? ataque.objetivoIdx === idx : esAtacante;
  const fx: FxCarta | null =
    ataque && ataque.etapa && (esAtacante || esObjetivoFx)
      ? {
          id: ataque.id,
          etapa: ataque.etapa,
          rol: esAtacante && esObjetivoFx ? "ambos" : esAtacante ? "atacante" : "objetivo",
          dx: 0,
          dy: equipoDe(ataque.atacanteIdx) === equipoDe(miIdx) ? -1 : 1,
          estilo: ataque.estilo,
          esquivado: ataque.esquivado,
        }
      : null;

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div className="flex max-w-full items-center gap-1 text-[11px]">
        <span className={cn("rounded px-1 font-black", equipo === "A" ? "bg-affinity-agil/25 text-affinity-agil" : "bg-affinity-termico/25 text-affinity-termico")}>
          {NOMBRE_ROL(miIdx, idx)}
        </span>
        <span className={cn("truncate", esTurno ? "font-bold text-reptile-green" : "text-foreground")}>{j.nombre}</span>
        <span className="shrink-0 text-foreground-muted">🂠{j.mazo.length}</span>
      </div>

      {reptil && activo ? (
        <GameCard
          reptil={reptil}
          hpActual={activo.hpActual}
          energiaActual={activo.energiaActual}
          energiaMax={estado.configuracion.reptiles[reptil.id]?.energiaMax}
          size="md"
          estados={activo.estados}
          aturdidoTurnos={activo.aturdidoTurnos}
          turnoActivo={esTurno}
          fx={fx}
          impacto={impacto}
          seleccionable={puedeElegir}
          seleccionada={esObjetivo}
          onClick={puedeElegir ? onElegir : undefined}
        />
      ) : caido ? (
        <GameCard reptil={caido} hpActual={0} size="md" />
      ) : (
        <div className="flex aspect-[3/4] w-32 items-center justify-center rounded-xl border-2 border-dashed border-border-subtle p-2 text-center text-[11px] text-foreground-muted sm:w-40">
          {tieneCartas(j) ? "Elige carta…" : "💀 Sin cartas"}
        </div>
      )}

      {banca.length > 0 && (
        <div className="flex gap-1" aria-label="Cartas en banca">
          {banca.map((c) => {
            const stats = estado.configuracion.reptiles[c.reptilId];
            const meta = stats ? AFFINITY_META[stats.afinidad] : null;
            const pct = stats ? Math.max(0, Math.min(100, (c.hpActual / stats.hp) * 100)) : 0;
            return (
              <span key={c.reptilId} title={`${stats?.nombre ?? "Reptil"} · ${Math.round(pct)}% (banca)`} className="flex flex-col items-center rounded-md border bg-panel px-1 py-0.5 text-[10px] leading-none" style={{ borderColor: meta?.color }}>
                {meta?.emoji ?? "🦎"}
                <span className="mt-0.5 block h-0.5 w-4 overflow-hidden rounded-full bg-panel-secondary">
                  <span className={cn("block h-full", pct > 50 ? "bg-state-ok" : pct > 20 ? "bg-state-warn" : "bg-state-danger")} style={{ width: `${pct}%` }} />
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function tieneCartas(j: EstadoEquipos["jugadores"][number]): boolean {
  return j.activo !== null || j.mazo.length > 0 || bancaDe(j).length > 0;
}

export function Sala2v2({ codigo, viewToken }: { codigo: string; viewToken: string }) {
  const router = useRouter();
  const { roster } = useRoster();
  const { config } = useEngineData();
  const room = useGameRoomEquipos(codigo, viewToken);
  const [mostrarCuenta, setMostrarCuenta] = useState(false);
  const cuentaMostrada = useRef(false);
  const [objetivoSel, setObjetivoSel] = useState<number | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [enlace, setEnlace] = useState("");

  useEffect(() => {
    // window solo existe en el cliente: el enlace se calcula tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnlace(urlDeSala(window.location.origin, codigo));
  }, [codigo]);

  useEffect(() => {
    if (room.estadoSala === "IN_PROGRESS" && !cuentaMostrada.current) {
      cuentaMostrada.current = true;
      setMostrarCuenta(true);
    }
  }, [room.estadoSala]);

  // Secuencia de combate: hasta el impacto la mesa muestra el estado de ANTES (la vida no se adelanta).
  const ataqueEnCurso = useMemo(
    () => (room.ultimoAtaque ? { id: room.ultimoAtaque.id, estilo: room.ultimoAtaque.estilo, antes: room.ultimoAtaque.antes } : null),
    [room.ultimoAtaque],
  );
  const seq = useSecuenciaCombate<EstadoEquipos>(ataqueEnCurso, room.estado, room.limpiarUltimoResultado);
  const animando = seq.bloqueado;
  const [enviando, setEnviando] = useState(false);

  const estado = room.estado;
  const vista = seq.estadoMostrado ?? estado;
  const miIdx = room.idx ?? 0;
  const esMiTurno = !!estado && estado.turnoIdx === miIdx && estado.fase !== "terminado";
  const objetivos = useMemo(() => (estado ? objetivosValidos(estado, miIdx) : []), [estado, miIdx]);
  const objetivo = objetivoSel !== null && objetivos.includes(objetivoSel) ? objetivoSel : (objetivos[0] ?? null);

  const opciones = useMemo(() => {
    if (!estado || !esMiTurno || objetivo === null) return [];
    const propio = estado.jugadores[miIdx].activo;
    const rival = estado.jugadores[objetivo].activo;
    if (!propio || !rival) return [];
    return opcionesContra(propio, rival, estado.configuracion, config, FEATURES.HIDE_ATTACK_DAMAGE);
  }, [estado, esMiTurno, objetivo, miIdx, config]);

  const ataqueTablero = useMemo(() => {
    const r = room.ultimoResultado;
    const a = room.ultimoAtaque;
    if (!r || !a) return null;
    const imp = impactoFlotante({ dano: r.danoEsperado, critico: r.critico, esquivado: r.esquivado, efecto: r.efectoAplicado });
    return { id: a.id, atacanteIdx: a.atacanteIdx, objetivoIdx: a.objetivoIdx, texto: imp.texto, tono: imp.tono, sobre: imp.sobre, estilo: a.estilo, esquivado: !!r.esquivado };
  }, [room.ultimoResultado, room.ultimoAtaque]);

  async function onAtacar(habilidadId: string, objetivoIdx: number) {
    if (animando || enviando) return;
    setEnviando(true);
    try {
      await room.atacar(habilidadId, objetivoIdx);
    } finally {
      setEnviando(false);
    }
  }

  if (room.error && !estado && room.estadoSala === null) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-state-danger">{room.error}</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  if (room.estadoSala === "CANCELLED") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-foreground-muted">Esta partida fue cancelada.</p>
        <Button onClick={() => router.push("/jugar")}>Ir al lobby</Button>
      </div>
    );
  }

  // ───────── Lobby: 4 asientos hasta que entren todos ─────────
  if (room.estadoSala === "WAITING" || (!estado && room.estadoSala !== "FINISHED")) {
    const asiento = (equipo: "A" | "B", n: number) => room.lobby.find((l) => l.equipo === equipo && l.asiento === n);
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 px-2 text-center">
        <p className="text-2xl">👥 ARENA 2 vs 2</p>
        <div>
          <p className="text-xs uppercase tracking-widest text-foreground-muted">Código de partida</p>
          <p className="text-4xl font-black tracking-[0.15em] text-reptile-green sm:text-5xl">{codigo}</p>
        </div>
        {FEATURES.ONLINE_QR && enlace && (
          <div className="rounded-2xl bg-white p-3 shadow-lg">
            <QRCodeSVG value={enlace} size={160} level="M" marginSize={0} title={`QR de la sala ${codigo}`} />
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(enlace || codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
          >
            {copiado ? "✓ Copiado" : "🔗 Copiar enlace"}
          </Button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button variant="outline" onClick={() => navigator.share({ title: "Reptil Kombat", text: `¡Juega 2 vs 2! Código ${codigo}`, url: enlace }).catch(() => undefined)}>
              📤 Compartir
            </Button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          {(["A", "B"] as const).map((equipo) => (
            <div key={equipo} className={cn("space-y-2 rounded-xl border p-3", equipo === "A" ? "border-affinity-agil/50" : "border-affinity-termico/50")}>
              <p className={cn("text-xs font-black uppercase tracking-wide", equipo === "A" ? "text-affinity-agil" : "text-affinity-termico")}>Equipo {equipo}</p>
              {[1, 2].map((n) => {
                const j = asiento(equipo, n);
                return (
                  <p key={n} className={cn("truncate rounded-lg px-2 py-1.5 text-sm", j ? "bg-panel-secondary font-semibold text-foreground" : "border border-dashed border-border-subtle text-foreground-muted")}>
                    {j ? `● ${j.nombre}${j.nombre === room.nombrePropio ? " (tú)" : ""}` : "○ Libre"}
                  </p>
                );
              })}
            </div>
          ))}
        </div>
        <p className="animate-pulse text-sm text-foreground-muted">Esperando jugadores ({room.lobby.length}/4)… la partida empieza sola al llegar el cuarto.</p>
        <Button variant="ghost" onClick={() => router.push("/jugar")}>
          ← Volver al lobby
        </Button>
      </div>
    );
  }

  if (mostrarCuenta) {
    return (
      <>
        <p className="p-6 text-center text-lg font-bold text-reptile-green">¡Equipos completos!</p>
        <Countdown onFinish={() => setMostrarCuenta(false)} />
      </>
    );
  }

  if (!estado) return null;
  const mesa = vista ?? estado;

  // ───────── Fin de partida ─────────
  if (!animando && (estado.fase === "terminado" || room.estadoSala === "FINISHED")) {
    const gane = (room.ganador ?? estado.ganador) === room.lado;
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <Card className={cn("p-8", gane ? "border-reptile-green/50 bg-reptile-green/10" : "border-state-danger/50 bg-state-danger/10")}>
          <p className="text-4xl">{gane ? "🏆" : "💀"}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{gane ? "¡VICTORIA DE EQUIPO!" : "DERROTA"}</p>
          <p className="mt-1 text-sm text-foreground-muted">{gane ? "Tu equipo ganó la batalla" : "Tu equipo ha caído"}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={() => router.push("/jugar")}>Jugar de nuevo</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Volver al inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const nombreTurno = estado.jugadores[estado.turnoIdx].nombre;
  const invocar = esMiTurno && puedeInvocarEquipos(estado);
  const atacar = esMiTurno && puedeAtacarEquipos(estado) && objetivo !== null;
  const miJugador = estado.jugadores[miIdx];
  const candidatos = candidatosDeCambio(miJugador, estado.configuracion, roster);
  const rivales = rivalesDe(miIdx);
  const mios = [miIdx, companeroDe(miIdx)];
  const puedeElegirObjetivo = atacar && objetivos.length > 1;
  const nombreHabilidad = room.ultimoResultado ? nombreDeHabilidad(estado.configuracion, room.ultimoResultado.habilidadId) : undefined;

  return (
    <div className="flex min-h-full flex-col gap-3">
      <ConnectionBanner conexion={room.conexion} />
      <RivalDesconectadoBanner senal={room.rivalSinSenal} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">👥 Sala {codigo}</h1>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-black", room.lado === "A" ? "bg-affinity-agil/25 text-affinity-agil" : "bg-affinity-termico/25 text-affinity-termico")}>
          Equipo {room.lado}
        </span>
      </div>

      <div className={cn("rounded-xl border py-2 text-center", esMiTurno ? "border-reptile-green/60 bg-reptile-green/10" : "border-border-subtle bg-panel")}>
        <p className="text-[10px] uppercase tracking-widest text-foreground-muted">Turno {mesa.numeroTurno}</p>
        <p className={cn("text-base font-black", esMiTurno ? "text-reptile-green" : "text-foreground")}>{esMiTurno ? "¡Tu turno!" : `Turno de ${nombreTurno}`}</p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-panel/60 p-3">
        <div className="grid grid-cols-2 gap-3">
          {rivales.map((i) => (
            <Asiento
              key={i}
              estado={mesa}
              idx={i}
              miIdx={miIdx}
              roster={roster}
              esObjetivo={atacar && objetivo === i}
              puedeElegir={!!puedeElegirObjetivo && estado.jugadores[i].activo !== null}
              onElegir={() => setObjetivoSel(i)}
              ataque={ataqueTablero ? { ...ataqueTablero, etapa: seq.etapa } : null}
              derrotado={room.ultimoDerrotado}
            />
          ))}
        </div>
        <div className="my-2 text-center text-lg font-black italic text-foreground-muted">VS</div>
        <div className="grid grid-cols-2 gap-3">
          {mios.map((i) => (
            <Asiento key={i} estado={mesa} idx={i} miIdx={miIdx} roster={roster} esObjetivo={false} puedeElegir={false} onElegir={() => undefined} ataque={ataqueTablero ? { ...ataqueTablero, etapa: seq.etapa } : null} derrotado={room.ultimoDerrotado} />
          ))}
        </div>
      </div>

      {room.error && (
        <button type="button" onClick={room.limpiarError} className="rounded-lg bg-state-danger/15 px-3 py-2 text-center text-sm text-state-danger">
          {room.error} (toca para cerrar)
        </button>
      )}

      {animando && (
        <div className="mt-auto rounded-xl border border-border-subtle bg-panel/70 py-3 text-center text-sm font-bold tracking-wide text-foreground-muted">⚔️ ¡Combate!</div>
      )}

      {!animando && (invocar || atacar) && (
        <ActionDock
          titulo={
            invocar
              ? "Invoca tu carta"
              : `Ataca a ${estado.jugadores[objetivo!].nombre}${puedeElegirObjetivo ? " · toca otro rival para cambiar de objetivo" : ""}`
          }
        >
          {invocar && <ManoInvocar candidatos={candidatos} onElegir={(id) => room.invocar(id)} />}
          {atacar && <AttackMenu opciones={opciones} ocultarDano={FEATURES.HIDE_ATTACK_DAMAGE} onAtacar={(id) => onAtacar(id, objetivo!)} ocupado={enviando} />}
          {atacar && FEATURES.CARD_SWAP && puedeCambiarEquipos(estado) && (
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

      {!animando && !esMiTurno && <p className="text-center text-sm text-foreground-muted">Esperando a {nombreTurno}…</p>}

      <SwapSheet
        abierto={cambiando}
        candidatos={candidatos}
        onElegir={(id) => {
          setCambiando(false);
          room.cambiar(id);
        }}
        onClose={() => setCambiando(false)}
      />

      <AttackAnimation resultado={room.ultimoResultado} habilidadNombre={nombreHabilidad} etapa={seq.etapa} />

      <div className="text-center">
        <Link href="/jugar" className="text-xs text-foreground-muted hover:text-reptile-green">
          ← Salir al lobby
        </Link>
      </div>
    </div>
  );
}
