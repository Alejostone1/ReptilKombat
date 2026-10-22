import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { calculateDamage } from "@/lib/game-engine/damage";
import { getAffinityTier } from "@/lib/game-engine/affinities";
import type { GameState, Lado } from "./types";
import { puedeInvocar, puedeAtacar, habilidadesDisponibles, puedeUsarHabilidad, sinAtaquesUtilizables, bancaDe, FORCEJEO_ID } from "./engine";

export type AccionIA = { tipo: "invocar"; reptilId: string } | { tipo: "atacar"; habilidadId: string };

/** Sesgo de personalidad sobre el mismo scoring: solo reordena preferencias, no reescribe la lógica. */
export type PersonalidadIA = "equilibrada" | "agresiva" | "defensiva" | "estrategica";

const HP_BAJO_UMBRAL = 0.35;
// Estado = autobuff/curación: la jugada realmente defensiva a HP bajo.
// Control = debuff/veneno sobre el rival: utilidad ofensiva, no de supervivencia propia.
const CATEGORIA_DEFENSIVA = "Estado";
const CATEGORIA_UTILIDAD = "Control";

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
  personalidad: PersonalidadIA = "equilibrada",
): AccionIA | null {
  if (state.turno !== ladoIA || state.fase === "terminado") return null;

  const propio = ladoIA === "A" ? state.jugadorA : state.jugadorB;
  const rival = ladoIA === "A" ? state.jugadorB : state.jugadorA;

  if (puedeInvocar(state)) {
    const rivalActivo = rival.activo ? roster.find((r) => r.id === rival.activo!.reptilId) : null;
    // Reemplazo forzado: puede salir del mazo o de la banca (la IA no cambia de carta por voluntad propia).
    const candidatos = [...propio.mazo, ...bancaDe(propio).map((c) => c.reptilId)]
      .map((id) => roster.find((r) => r.id === id))
      .filter((r): r is Reptil => r !== undefined);
    if (candidatos.length === 0) return null;

    const puntuado = candidatos.map((r) => {
      const tier = rivalActivo ? getAffinityTier(r.afinidad, rivalActivo.afinidad) : "neutral";
      const puntaje = tier === "ventaja" ? 2 : tier === "neutral" ? 1 : 0;
      // Una carta de la banca llega con la vida que tenía: a igual matchup se prefiere la más sana.
      const enBanca = bancaDe(propio).find((c) => c.reptilId === r.id);
      const salud = enBanca ? enBanca.hpActual / r.hp : 1;
      return { reptil: r, puntaje, salud };
    });
    puntuado.sort((a, b) => b.puntaje - a.puntaje || b.salud - a.salud || b.reptil.bst - a.reptil.bst);
    return { tipo: "invocar", reptilId: puntuado[0].reptil.id };
  }

  if (puedeAtacar(state)) {
    const atacante = propio.activo ? roster.find((r) => r.id === propio.activo!.reptilId) : null;
    const defensorBase = rival.activo ? roster.find((r) => r.id === rival.activo!.reptilId) : null;
    // Nunca elige una habilidad en cooldown o sin energía suficiente: mismo gate que usa la UI humana.
    const disponibles = habilidadesDisponibles(state, abilities).filter((h) => puedeUsarHabilidad(propio.activo!, h));
    if (!atacante || !defensorBase || !propio.activo || !rival.activo) return null;
    // Sin ataques utilizables (usos agotados): el Forcejeo evita que la IA deje la partida atascada.
    if (disponibles.length === 0) {
      return sinAtaquesUtilizables(state.configuracion, propio.activo) ? { tipo: "atacar", habilidadId: FORCEJEO_ID } : null;
    }

    const defensorConHp: Reptil = { ...defensorBase, hp: rival.activo.hpActual };
    const tierPropio = getAffinityTier(atacante.afinidad, defensorBase.afinidad);
    const opciones = disponibles.map((h) => ({
      habilidad: h,
      resultado: calculateDamage(atacante, defensorConHp, h, config),
    }));
    opciones.sort((a, b) => b.resultado.danoEsperado - a.resultado.danoEsperado);

    const umbralHpBajo = personalidad === "defensiva" ? 0.5 : personalidad === "agresiva" ? 0.15 : HP_BAJO_UMBRAL;
    const hpBajo = propio.activo.hpActual / atacante.hp < umbralHpBajo;

    if (hpBajo && personalidad !== "agresiva") {
      const defensiva = opciones.find((o) => o.habilidad.categoria === CATEGORIA_DEFENSIVA);
      if (defensiva) return { tipo: "atacar", habilidadId: defensiva.habilidad.id };
    }

    if (personalidad === "estrategica" && tierPropio === "ventaja") {
      // Con ventaja de afinidad ya asegurada, prioriza debilitar aún más al rival en vez de solo maximizar daño puntual.
      const utilidad = opciones.find((o) => o.habilidad.categoria === CATEGORIA_UTILIDAD);
      if (utilidad) return { tipo: "atacar", habilidadId: utilidad.habilidad.id };
    }

    return { tipo: "atacar", habilidadId: opciones[0].habilidad.id };
  }

  return null;
}
