import type { Etapa, EstiloAtaque } from "@/lib/card-game/estilo-ataque";

/** Lo que una carta necesita saber para animarse durante un ataque. */
export interface FxCarta {
  /** Id del ataque (re-dispara efectos). */
  id: number;
  etapa: Etapa | null;
  /** atacante: ejecuta el ataque · objetivo: lo recibe · ambos: se apoya a sí misma (curación, mejoras). */
  rol: "atacante" | "objetivo" | "ambos";
  /** Dirección unitaria hacia el rival (para la embestida y el retroceso). */
  dx: number;
  dy: number;
  estilo: EstiloAtaque;
  /** El objetivo esquivó el ataque: se aparta en vez de recibir el golpe. */
  esquivado?: boolean;
}

const REPOSO = { x: 0, y: 0, scale: 1, rotate: 0 };

/**
 * Pose de la carta en cada etapa de combate (qué hace el cuerpo del animal):
 * - atacante: se agacha y carga → se echa atrás (anticipación) → se lanza → se queda en el golpe → vuelve.
 * - objetivo: se tensa → recibe (sacudida, empujón) → retrocede → se recompone.
 * Con "reducir movimiento" activado el sistema operativo, solo quedan los destellos (sin desplazamientos).
 */
export function poseDeCombate(fx: FxCarta | null, reducir: boolean) {
  if (!fx || !fx.etapa) return { animate: REPOSO as Record<string, number | number[]>, transition: { duration: 0.25, ease: "easeOut" as const } };
  const { etapa, dx, dy, estilo, rol } = fx;
  const dur = estilo.duraciones[etapa] / 1000;
  const m = reducir ? 0 : 1;
  const base = { duration: dur, ease: "easeInOut" as const };

  if (rol === "objetivo" && fx.esquivado) {
    // Esquiva: da un salto lateral justo cuando llega el golpe y vuelve a su sitio.
    const lado = dx !== 0 ? dx : 1;
    switch (etapa) {
      case "preparacion":
      case "anticipacion":
        return { animate: { ...REPOSO, scale: 0.99 }, transition: base };
      case "ejecucion":
        return { animate: { ...REPOSO, scale: 0.97 }, transition: base };
      case "impacto":
        return {
          animate:
            dy !== 0
              ? { x: [0, 30 * m, 0], y: [0, 0, 0], scale: [1, 1.03, 1], rotate: [0, 6 * m, 0] }
              : { x: [0, lado * 16 * m, 0], y: [0, -22 * m, 0], scale: [1, 1.05, 1], rotate: [0, lado * 5 * m, 0] },
          transition: { duration: dur, ease: "easeOut" as const },
        };
      default:
        return { animate: REPOSO, transition: base };
    }
  }

  if (rol === "objetivo") {
    const s = estilo.temblor * m;
    switch (etapa) {
      case "preparacion":
      case "anticipacion":
        return { animate: { ...REPOSO, scale: 0.99 }, transition: base };
      case "ejecucion":
        return { animate: { ...REPOSO, scale: 0.97 }, transition: base };
      case "impacto":
        return {
          animate: { x: [0, -s, s, -s * 0.7, s * 0.7, -s * 0.3, 0], y: [0, dy * s * 0.4, 0], scale: [1, 0.93, 1.02, 1], rotate: [0, -dx * 3 * m, dx * 2 * m, 0] },
          transition: { duration: dur, ease: "easeOut" as const },
        };
      case "reaccion":
        return { animate: { x: dx * 10 * m, y: dy * 10 * m, rotate: dx * 2 * m, scale: 0.985 }, transition: base };
      default:
        return { animate: REPOSO, transition: base };
    }
  }

  // Atacante (o animal que se apoya a sí mismo).
  const mueve = rol === "atacante" && estilo.trayecto === "embestida";
  const poco = rol === "atacante" && estilo.trayecto === "proyectil";
  const a = estilo.alcance * m;
  switch (etapa) {
    case "preparacion":
      return { animate: { ...REPOSO, y: 2 * m, scale: 1.05 }, transition: base };
    case "anticipacion":
      return { animate: { ...REPOSO, x: mueve || poco ? -dx * 14 * m : 0, y: mueve || poco ? -dy * 14 * m : 0, scale: 0.96 }, transition: base };
    case "ejecucion":
      return {
        animate: mueve ? { x: dx * a, y: dy * a, scale: 1.1, rotate: 0 } : poco ? { x: dx * 8 * m, y: dy * 8 * m, scale: 1.04, rotate: 0 } : { ...REPOSO, scale: 1.08 },
        // La embestida arranca despacio y acelera: se siente el "tirón".
        transition: { duration: dur, ease: [0.5, 0, 1, 0.6] as [number, number, number, number] },
      };
    case "impacto":
      return { animate: mueve ? { x: dx * a * 0.85, y: dy * a * 0.85, scale: 1.08, rotate: 0 } : { ...REPOSO, scale: 1.05 }, transition: { duration: dur, ease: "easeOut" as const } };
    case "reaccion":
      return { animate: mueve ? { x: dx * a * 0.3, y: dy * a * 0.3, scale: 1.02, rotate: 0 } : { ...REPOSO, scale: 1.02 }, transition: base };
    default:
      return { animate: REPOSO, transition: base };
  }
}
