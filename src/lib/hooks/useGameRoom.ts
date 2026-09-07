"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canalDeVista } from "@/lib/supabase/game-queries";
import type { GameState, Lado } from "@/lib/card-game/types";
import type { ResultadoAtaque } from "@/lib/card-game/engine";
import type { EstadoSala } from "@/lib/supabase/types";
import { obtenerSessionId } from "@/lib/utils/session";

type Conexion = "conectando" | "conectado" | "reconectando";

interface RoomHookState {
  estado: GameState | null;
  ultimoResultado: Omit<ResultadoAtaque, "state"> | null;
  /** Igual que en game-store: el defensor derrotado desaparece de `estado.activo` en el mismo update, así que se captura aparte para mostrarlo un instante. */
  ultimoDerrotado: { lado: Lado; reptilId: string } | null;
  estadoSala: EstadoSala | null;
  lado: Lado | null;
  nombrePropio: string | null;
  nombreRival: string | null;
  ganador: Lado | null;
  conexion: Conexion;
  error: string | null;
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
    estadoSala: null,
    lado: null,
    nombrePropio: null,
    nombreRival: null,
    ganador: null,
    conexion: "conectando",
    error: null,
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

  const ejecutarAccion = useCallback(
    async (accion: { tipo: "invocar"; reptilId: string } | { tipo: "atacar"; habilidadId: string }) => {
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
      setEstado((s) => ({
        ...s,
        estado: json.estado,
        ultimoResultado: json.ultimoResultado,
        ultimoDerrotado: derivarUltimoDerrotado(s.estado, json.ultimoResultado),
        estadoSala: json.estado?.fase === "terminado" ? "FINISHED" : s.estadoSala,
        ganador: json.estado?.ganador ?? s.ganador,
        error: null,
      }));
    },
    [codigo],
  );

  return {
    ...estado,
    invocar: (reptilId: string) => ejecutarAccion({ tipo: "invocar", reptilId }),
    atacar: (habilidadId: string) => ejecutarAccion({ tipo: "atacar", habilidadId }),
    limpiarUltimoDerrotado: () => setEstado((s) => ({ ...s, ultimoDerrotado: null })),
    refrescar,
  };
}
