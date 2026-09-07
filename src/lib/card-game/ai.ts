import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { GameState, Lado } from "./types";
import { puedeInvocar, puedeAtacar, habilidadesDisponibles } from "./engine";

export type AccionIA = { tipo: "invocar"; reptilId: string } | { tipo: "atacar"; habilidadId: string };

const HP_BAJO_UMBRAL = 0.35;
const CATEGORIAS_DEFENSIVAS = new Set(["Control", "Estado"]);

/**
 * Decide la siguiente acción de la IA para el lado `ladoIA`, cuando es su turno.
 * Nunca elige algo ilegal (usa las mismas validaciones puedeInvocar/puedeAtacar
 * que el motor) y reutiliza calculateDamage()/getAffinityTier() — el mismo
 * cálculo que ya ordena las opciones de ataque para el jugador humano.
 */
export function decidirAccionIA(
  state: GameState,
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
  ladoIA: Lado,
): AccionIA | null {
  if (state.turno !== ladoIA || state.fase === "terminado") return null;

  const propio = ladoIA === "A" ? state.jugadorA : state.jugadorB;
  const rival = ladoIA === "A" ? state.jugadorB : state.jugadorA;

  if (puedeInvocar(state)) {
    const rivalActivo = rival.activo ? roster.find((r) => r.id === rival.activo!.reptilId) : null;
    const candidatos = propio.mazo
      .map((id) => roster.find((r) => r.id === id))
      .filter((r): r is Reptil => r !== undefined);
    if (candidatos.length === 0) return null;

    const puntuado = candidatos.map((r) => {
      const tier = rivalActivo ? getAffinityTier(r.afinidad, rivalActivo.afinidad) : "neutral";
      const puntaje = tier === "ventaja" ? 2 : tier === "neutral" ? 1 : 0;
      return { reptil: r, puntaje };
    });
    puntuado.sort((a, b) => b.puntaje - a.puntaje || b.reptil.bst - a.reptil.bst);
    return { tipo: "invocar", reptilId: puntuado[0].reptil.id };
  }

  if (puedeAtacar(state)) {
    const atacante = propio.activo ? roster.find((r) => r.id === propio.activo!.reptilId) : null;
    const defensorBase = rival.activo ? roster.find((r) => r.id === rival.activo!.reptilId) : null;
    const disponibles = habilidadesDisponibles(state, abilities);
    if (!atacante || !defensorBase || !propio.activo || !rival.activo || disponibles.length === 0) return null;

    const defensorConHp: Reptil = { ...defensorBase, hp: rival.activo.hpActual };
    const opciones = disponibles.map((h) => ({
      habilidad: h,
      resultado: calculateDamage(atacante, defensorConHp, h, config),
    }));
    opciones.sort((a, b) => b.resultado.danoEsperado - a.resultado.danoEsperado);

    const hpBajo = propio.activo.hpActual / atacante.hp < HP_BAJO_UMBRAL;
    if (hpBajo) {
      const defensiva = opciones.find((o) => CATEGORIAS_DEFENSIVAS.has(o.habilidad.categoria));
      if (defensiva) return { tipo: "atacar", habilidadId: defensiva.habilidad.id };
    }
    return { tipo: "atacar", habilidadId: opciones[0].habilidad.id };
  }

  return null;
}
