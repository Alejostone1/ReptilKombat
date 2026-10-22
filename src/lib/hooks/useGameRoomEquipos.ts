"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canalDeVista } from "@/lib/supabase/game-queries";
import type { Lado } from "@/lib/card-game/types";
import type { EstadoEquipos, ResultadoAtaqueEquipos } from "@/lib/card-game/engine-equipos";
import type { EstadoSala } from "@/lib/supabase/types";
import { obtenerSessionId } from "@/lib/utils/session";
import { INTERVALO_PING_MS } from "@/lib/card-game/conexion";
import { estiloParaAtaque, nuevoIdAtaque, type EstiloAtaque } from "@/lib/card-game/estilo-ataque";

type Conexion = "conectando" | "conectado" | "reconectando";
type ResultadoSinEstado = Omit<ResultadoAtaqueEquipos, "state">;

export interface AsientoLobby {
  nombre: string;
  equipo: Lado;
  asiento: number;
}

interface EstadoHook {
  estado: EstadoEquipos | null;
  ultimoResultado: ResultadoSinEstado | null;
  /** Quién atacó a quién en el último ataque (+ contador para re-disparar animaciones). */
  ultimoAtaque: { id: number; atacanteIdx: number; objetivoIdx: number; estilo: EstiloAtaque; antes: EstadoEquipos } | null;
  /** Carta derrotada en el último ataque: desaparece de `activo` en el mismo update, así que se guarda para mostrarla un instante. */
  ultimoDerrotado: { idx: number; reptilId: string } | null;
  estadoSala: EstadoSala | null;
  idx: number | null;
  lado: Lado | null;
  nombrePropio: string | null;
  ganador: Lado | null;
  lobby: AsientoLobby[];
  conexion: Conexion;
  error: string | null;
  rivalSinSenal: { segundos: number; recibidoEn: number } | null;
}

type Accion = { tipo: "invocar"; reptilId: string } | { tipo: "cambiar"; reptilId: string } | { tipo: "atacar"; habilidadId: string; objetivo: number };

function derivarAtaque(previo: EstadoEquipos | null, r: ResultadoSinEstado | null) {
  if (!previo || !r) return null;
  const activo = previo.jugadores[previo.turnoIdx]?.activo;
  const categoria = previo.configuracion.habilidades[r.habilidadId]?.categoria ?? "Fisica";
  return {
    id: nuevoIdAtaque(),
    atacanteIdx: previo.turnoIdx,
    objetivoIdx: r.objetivoIdx,
    estilo: estiloParaAtaque(previo.configuracion, activo?.reptilId ?? "", categoria, r.critico),
    antes: previo,
  };
}

/** El servidor manda cada jugada dos veces al que la hizo (respuesta HTTP + difusión): la segunda ya está aplicada. */
function yaAplicado(actual: EstadoEquipos | null, nuevo: EstadoEquipos | null | undefined): boolean {
  return !!actual && !!nuevo && nuevo.numeroTurno <= actual.numeroTurno && nuevo.fase === actual.fase;
}

function derivarDerrotado(previo: EstadoEquipos | null, r: ResultadoSinEstado | null) {
  if (!previo || !r?.derrotado) return null;
  const reptilId = previo.jugadores[r.objetivoIdx]?.activo?.reptilId;
  return reptilId ? { idx: r.objetivoIdx, reptilId } : null;
}

/** Igual que useGameRoom (1 vs 1) pero para salas 2 vs 2: 4 jugadores, vista redactada por asiento, lobby en vivo. */
export function useGameRoomEquipos(codigo: string | null, viewToken: string | null) {
  const [s, setS] = useState<EstadoHook>({
    estado: null,
    ultimoResultado: null,
    ultimoAtaque: null,
    ultimoDerrotado: null,
    estadoSala: null,
    idx: null,
    lado: null,
    nombrePropio: null,
    ganador: null,
    lobby: [],
    conexion: "conectando",
    error: null,
    rivalSinSenal: null,
  });
  const sessionIdRef = useRef("");

  const refrescar = useCallback(async () => {
    if (!codigo) return;
    sessionIdRef.current = obtenerSessionId();
    try {
      const res = await fetch(`/api/game/rooms/${codigo}?sessionId=${encodeURIComponent(sessionIdRef.current)}`);
      const json = await res.json();
      if (!res.ok) {
        setS((p) => ({ ...p, error: json.error ?? "No se pudo cargar la sala." }));
        return;
      }
      setS((p) => ({
        ...p,
        estado: json.estado,
        estadoSala: json.estadoSala,
        idx: json.idx,
        lado: json.lado,
        nombrePropio: json.nombrePropio,
        ganador: json.ganador,
        lobby: json.lobby ?? [],
        error: null,
      }));
    } catch {
      setS((p) => ({ ...p, conexion: "reconectando" }));
    }
  }, [codigo]);

  useEffect(() => {
    if (!codigo || !viewToken) return;
    refrescar();
    const supabase = createClient();
    const canal = supabase.channel(canalDeVista(viewToken));
    canal
      .on("broadcast", { event: "estado" }, ({ payload }) => {
        setS((p) => {
          if (yaAplicado(p.estado, payload.estado) && (payload.estadoSala ?? p.estadoSala) === p.estadoSala) return p;
          return {
            ...p,
            // Un broadcast de lobby trae estado null: se conserva el anterior solo si seguimos esperando.
            estado: payload.estado ?? (payload.estadoSala === "WAITING" ? null : p.estado),
            ultimoResultado: payload.ultimoResultado,
            ultimoAtaque: derivarAtaque(p.estado, payload.ultimoResultado) ?? p.ultimoAtaque,
            ultimoDerrotado: derivarDerrotado(p.estado, payload.ultimoResultado),
            estadoSala: payload.estadoSala ?? p.estadoSala,
            ganador: payload.ganador ?? p.ganador,
            lobby: payload.lobby ?? p.lobby,
          };
        });
        // En cuanto empieza la partida, se trae la vista completa (idx/lado propios).
        if (payload.estadoSala === "IN_PROGRESS") refrescar();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setS((p) => ({ ...p, conexion: "conectado" }));
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setS((p) => ({ ...p, conexion: "reconectando" }));
      });
    const alVolverOnline = () => refrescar();
    window.addEventListener("online", alVolverOnline);
    return () => {
      window.removeEventListener("online", alVolverOnline);
      supabase.removeChannel(canal);
    };
  }, [codigo, viewToken, refrescar]);

  // Latido (misma ruta que 1 vs 1): mantiene viva mi señal y detecta si alguien se fue.
  const estadoSalaActual = s.estadoSala;
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
        setS((p) => ({ ...p, rivalSinSenal: seg > 0 ? { segundos: seg, recibidoEn: Date.now() } : null }));
        if (json.estadoSala && json.estadoSala !== estadoSalaActual) refrescar();
      } catch {
        /* sin red: el siguiente latido lo reintenta */
      }
    }
    ping();
    const intervalo = setInterval(ping, INTERVALO_PING_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [codigo, viewToken, estadoSalaActual, refrescar]);

  const ejecutar = useCallback(
    async (accion: Accion) => {
      if (!codigo) return;
      const res = await fetch(`/api/game/rooms/${codigo}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current || obtenerSessionId(), accion }),
      });
      const json = await res.json();
      if (!res.ok) {
        setS((p) => ({ ...p, error: json.error ?? "Acción inválida." }));
        return;
      }
      setS((p) => {
        if (yaAplicado(p.estado, json.estado)) return p;
        const r: ResultadoSinEstado | null = json.ultimoResultado;
        return {
          ...p,
          estado: json.estado,
          ultimoResultado: r,
          ultimoAtaque: derivarAtaque(p.estado, r) ?? p.ultimoAtaque,
          ultimoDerrotado: derivarDerrotado(p.estado, r),
          estadoSala: json.estado?.fase === "terminado" ? "FINISHED" : p.estadoSala,
          ganador: json.estado?.ganador ?? p.ganador,
          error: null,
        };
      });
    },
    [codigo],
  );

  return {
    ...s,
    invocar: (reptilId: string) => ejecutar({ tipo: "invocar", reptilId }),
    cambiar: (reptilId: string) => ejecutar({ tipo: "cambiar", reptilId }),
    atacar: (habilidadId: string, objetivo: number) => ejecutar({ tipo: "atacar", habilidadId, objetivo }),
    limpiarUltimoResultado: () => setS((p) => ({ ...p, ultimoResultado: null, ultimoDerrotado: null, ultimoAtaque: null })),
    limpiarError: () => setS((p) => ({ ...p, error: null })),
    refrescar,
  };
}
