"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canalDeVista } from "@/lib/supabase/game-queries";
import type { GameState, Lado } from "@/lib/card-game/types";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import type { EstadoSala } from "@/lib/supabase/types";
import { obtenerSessionId } from "@/lib/utils/session";
import { nivelDeGolpe, recordarAtaque, type MemoriaAtaques } from "@/lib/card-game/memoria-ataques";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { INTERVALO_PING_MS } from "@/lib/card-game/conexion";

type Conexion = "conectando" | "conectado" | "reconectando";

interface RoomHookState {
  estado: GameState | null;
  ultimoResultado: Omit<ResultadoAtaque, "state"> | null;
  /** Igual que en game-store: el defensor derrotado desaparece de `estado.activo` en el mismo update, así que se captura aparte para mostrarlo un instante. */
  ultimoDerrotado: { lado: Lado; reptilId: string } | null;
  /** Quién atacó (según el turno del estado previo) + contador, para animar tanto mis ataques como los del rival. */
  ultimoAtaque: { id: number; atacante: Lado } | null;
  /** Lo que aprendí de MIS ataques en esta partida (solo cliente; nunca se envía al servidor). */
  memoria: MemoriaAtaques;
  estadoSala: EstadoSala | null;
  lado: Lado | null;
  nombrePropio: string | null;
  nombreRival: string | null;
  ganador: Lado | null;
  conexion: Conexion;
  error: string | null;
  /** Último dato de señal del rival: segundos sin latido y cuándo (Date.now) se supo. null = sin datos / todo bien. */
  rivalSinSenal: { segundos: number; recibidoEn: number } | null;
}

function derivarUltimoAtaque(
  estadoPrevio: GameState | null,
  ultimoResultado: Omit<ResultadoAtaque, "state"> | null,
  idPrevio: number,
): { id: number; atacante: Lado } | null {
  if (!estadoPrevio || !ultimoResultado) return null;
  return { id: idPrevio + 1, atacante: estadoPrevio.turno };
}

/** Antes de reemplazar `estado`, calcula quién fue derrotado (si aplica) usando el turno del estado previo. */
export function derivarUltimoDerrotado(
  estadoPrevio: GameState | null,
  ultimoResultado: Omit<ResultadoAtaque, "state"> | null,
): { lado: Lado; reptilId: string } | null {
  if (!estadoPrevio || !ultimoResultado?.derrotado) return null;
  const ladoDefensor: Lado = estadoPrevio.turno === "A" ? "B" : "A";
  const reptilId = (ladoDefensor === "A" ? estadoPrevio.jugadorA : estadoPrevio.jugadorB).activo?.reptilId;
  return reptilId ? { lado: ladoDefensor, reptilId } : null;
}

export function useGameRoom(codigo: string | null, viewToken: string | null) {
  const [estado, setEstado] = useState<RoomHookState>({
    estado: null,
    ultimoResultado: null,
    ultimoDerrotado: null,
    ultimoAtaque: null,
    memoria: {},
    estadoSala: null,
    lado: null,
    nombrePropio: null,
    nombreRival: null,
    ganador: null,
    conexion: "conectando",
    error: null,
    rivalSinSenal: null,
  });
  const sessionIdRef = useRef<string>("");

  const refrescar = useCallback(async () => {
    if (!codigo) return;
    sessionIdRef.current = obtenerSessionId();
    try {
      const res = await fetch(`/api/game/rooms/${codigo}?sessionId=${encodeURIComponent(sessionIdRef.current)}`);
      const json = await res.json();
      if (!res.ok) {
        setEstado((s) => ({ ...s, error: json.error ?? "No se pudo cargar la sala." }));
        return;
      }
      setEstado((s) => ({
        ...s,
        estado: json.estado,
        estadoSala: json.estadoSala,
        lado: json.lado,
        nombrePropio: json.nombrePropio,
        nombreRival: json.nombreRival,
        ganador: json.ganador,
        error: null,
      }));
    } catch {
      setEstado((s) => ({ ...s, conexion: "reconectando" }));
    }
  }, [codigo]);

  useEffect(() => {
    if (!codigo || !viewToken) return;
    refrescar();

    const supabase = createClient();
    const channel = supabase.channel(canalDeVista(viewToken));

    channel
      .on("broadcast", { event: "estado" }, ({ payload }) => {
        setEstado((s) => ({
          ...s,
          estado: payload.estado,
          ultimoResultado: payload.ultimoResultado,
          ultimoDerrotado: derivarUltimoDerrotado(s.estado, payload.ultimoResultado),
          ultimoAtaque: derivarUltimoAtaque(s.estado, payload.ultimoResultado, s.ultimoAtaque?.id ?? 0) ?? s.ultimoAtaque,
          estadoSala: payload.estadoSala ?? s.estadoSala,
          nombreRival: payload.nombreRival ?? s.nombreRival,
          ganador: payload.ganador ?? s.ganador,
        }));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setEstado((s) => ({ ...s, conexion: "conectado" }));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setEstado((s) => ({ ...s, conexion: "reconectando" }));
        }
      });

    function alVolverOnline() {
      refrescar();
    }
    window.addEventListener("online", alVolverOnline);

    return () => {
      window.removeEventListener("online", alVolverOnline);
      supabase.removeChannel(channel);
    };
  }, [codigo, viewToken, refrescar]);

  // Latido: mantiene viva mi señal y detecta que el rival se fue (>60 s sin señal = gano por abandono).
  const estadoSalaActual = estado.estadoSala;
  useEffect(() => {
    if (!codigo || !viewToken) return;
    if (estadoSalaActual !== "WAITING" && estadoSalaActual !== "IN_PROGRESS") return;
    let cancelado = false;

    async function ping() {
      if (cancelado) return;
      try {
        const res = await fetch(`/api/game/rooms/${codigo}/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: obtenerSessionId() }),
        });
        if (!res.ok || cancelado) return;
        const json = await res.json();
        const seg: number = json.rivalSegundosSinSenal ?? 0;
        setEstado((s) => ({ ...s, rivalSinSenal: seg > 0 ? { segundos: seg, recibidoEn: Date.now() } : null }));
        if (json.estadoSala && json.estadoSala !== estadoSalaActual) refrescar();
      } catch {
        /* sin red: el siguiente latido lo reintenta */
      }
    }

    ping();
    const intervalo = setInterval(ping, INTERVALO_PING_MS);
    function alVolver() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [codigo, viewToken, estadoSalaActual, refrescar]);

  const ejecutarAccion = useCallback(
    async (accion: { tipo: "invocar"; reptilId: string } | { tipo: "atacar"; habilidadId: string } | { tipo: "cambiar"; reptilId: string }) => {
      if (!codigo) return;
      const res = await fetch(`/api/game/rooms/${codigo}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, accion }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEstado((s) => ({ ...s, error: json.error ?? "Acción inválida." }));
        return;
      }
      setEstado((s) => {
        const r: Omit<ResultadoAtaque, "state"> | null = json.ultimoResultado;
        let memoria = s.memoria;
        if (accion.tipo === "atacar" && r && s.estado && s.lado) {
          const rival = s.lado === "A" ? s.estado.jugadorB : s.estado.jugadorA;
          const hpMax = rival.activo ? (s.estado.configuracion.reptiles[rival.activo.reptilId]?.hp ?? 0) : 0;
          memoria = recordarAtaque(memoria, accion.habilidadId, nivelDeGolpe(r.danoEsperado, r.critico, DEFAULT_ENGINE_CONFIG.criticoMultiplicador, hpMax));
        }
        return {
        ...s,
        memoria,
        ultimoAtaque: derivarUltimoAtaque(s.estado, r, s.ultimoAtaque?.id ?? 0) ?? s.ultimoAtaque,
        estado: json.estado,
        ultimoResultado: json.ultimoResultado,
        ultimoDerrotado: derivarUltimoDerrotado(s.estado, json.ultimoResultado),
        estadoSala: json.estado?.fase === "terminado" ? "FINISHED" : s.estadoSala,
        ganador: json.estado?.ganador ?? s.ganador,
        error: null,
        };
      });
    },
    [codigo],
  );

  return {
    ...estado,
    invocar: (reptilId: string) => ejecutarAccion({ tipo: "invocar", reptilId }),
    atacar: (habilidadId: string) => ejecutarAccion({ tipo: "atacar", habilidadId }),
    cambiar: (reptilId: string) => ejecutarAccion({ tipo: "cambiar", reptilId }),
    limpiarUltimoDerrotado: () => setEstado((s) => ({ ...s, ultimoDerrotado: null })),
    limpiarUltimoResultado: () => setEstado((s) => ({ ...s, ultimoResultado: null, ultimoDerrotado: null })),
    refrescar,
  };
}
