"use client";

import { useEffect, useRef, useState } from "react";
import { ETAPAS, resultadoRevelado, type Etapa, type EstiloAtaque } from "@/lib/card-game/estilo-ataque";

interface AtaqueEnCurso<T> {
  id: number;
  estilo: EstiloAtaque;
  /** Estado de la partida ANTES del ataque: es el que se muestra hasta que llega el impacto. */
  antes: T | null;
}

/**
 * Reproduce las etapas de una animación de combate (preparación → … → recuperación) para el ataque `ataque`.
 * No ejecuta nada de la lógica: el ataque ya se resolvió en el motor. Solo decide qué ve el jugador en cada
 * momento: hasta el impacto se sigue mostrando el estado de ANTES (vida sin cambiar) y desde el impacto el
 * real. `alTerminar` se llama una sola vez por ataque. `etapa` es null cuando no hay animación en curso;
 * mientras no sea null conviene bloquear los controles (`bloqueado`).
 */
export function useSecuenciaCombate<T>(ataque: AtaqueEnCurso<T> | null, estadoActual: T | null, alTerminar: () => void) {
  const [prog, setProg] = useState<{ id: number; etapa: Etapa | null } | null>(null);
  const terminar = useRef(alTerminar);
  const estiloRef = useRef<EstiloAtaque | null>(ataque?.estilo ?? null);
  useEffect(() => {
    terminar.current = alTerminar;
    estiloRef.current = ataque?.estilo ?? null;
  });

  // La secuencia depende SOLO del id del ataque: así un objeto nuevo con el mismo id no la reinicia.
  const id = ataque?.id ?? null;
  useEffect(() => {
    const estilo = estiloRef.current;
    if (id === null || !estilo) return;
    let cancelado = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    for (const etapa of ETAPAS) {
      timers.push(setTimeout(() => !cancelado && setProg({ id, etapa }), t));
      t += estilo.duraciones[etapa];
    }
    timers.push(
      setTimeout(() => {
        if (cancelado) return;
        setProg({ id, etapa: null });
        terminar.current();
      }, t),
    );
    return () => {
      cancelado = true;
      timers.forEach(clearTimeout);
    };
  }, [id]);

  // En el primer render de un ataque nuevo (antes de que corra el efecto) ya cuenta como "preparación":
  // así nunca hay un destello con la vida nueva antes de empezar.
  const etapa: Etapa | null = ataque ? (prog && prog.id === ataque.id ? prog.etapa : "preparacion") : null;
  const estadoMostrado: T | null = etapa && !resultadoRevelado(etapa) && ataque?.antes ? ataque.antes : estadoActual;
  return { etapa, estadoMostrado, bloqueado: etapa !== null };
}
