"use client";

import { useEffect, useState } from "react";
import { segundosRestantesRival } from "@/lib/card-game/conexion";

/** Segundos sin señal a partir de los cuales se avisa (un latido perdido no alarma). */
const UMBRAL_AVISO_SEG = 20;

interface Props {
  /** Último dato de señal del rival: segundos sin latido al recibirlo y cuándo (Date.now) llegó. */
  senal: { segundos: number; recibidoEn: number } | null;
}

/** Aviso "Rival desconectado… vuelve en Ns": cuenta atrás hasta darle la partida por abandonada. */
export function RivalDesconectadoBanner({ senal }: Props) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!senal) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [senal]);

  if (!senal) return null;
  const segundos = senal.segundos + Math.max(0, (ahora - senal.recibidoEn) / 1000);
  if (segundos < UMBRAL_AVISO_SEG) return null;
  const restante = segundosRestantesRival(segundos);

  return (
    <div role="status" className="rounded-xl border border-state-warn/50 bg-state-warn/15 px-3 py-2 text-center text-sm font-semibold text-state-warn">
      📡 Rival desconectado… si no vuelve en {restante}s, ¡ganas por abandono!
    </div>
  );
}
