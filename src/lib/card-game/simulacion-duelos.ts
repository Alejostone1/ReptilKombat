import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { crearRng } from "@/lib/utils/rng";
import { atacar, configuracionARosterYHabilidades, crearPartida, invocar } from "./engine";
import { decidirAccionIA, type PersonalidadIA } from "./ai";
import type { Lado } from "./types";

export interface ResultadoDuelo {
  ganador: Lado | null;
  turnos: number;
}

const MAX_TURNOS = 200;

/**
 * Duelo 1 carta contra 1 carta con las reglas reales del motor (energía, recarga, 3 usos por ataque,
 * Forcejeo, críticos y variación con semilla) y la IA decidiendo por ambos lados. Es la unidad con la que se
 * mide el equilibrio de cada animal: ver `tasasDeVictoria`.
 */
export function simularDuelo(
  idA: string,
  idB: string,
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
  semilla: number,
  personalidad: PersonalidadIA = "equilibrada",
): ResultadoDuelo {
  const rng = crearRng(semilla);
  let state = crearPartida([idA], [idB], roster, abilities, config);
  state = invocar(state, idA, roster);
  state = invocar(state, idB, roster);
  const { roster: snapRoster, abilities: snapAbilities } = configuracionARosterYHabilidades(state.configuracion);
  let guardia = 0;
  while (state.fase !== "terminado" && guardia++ < MAX_TURNOS) {
    const accion = decidirAccionIA(state, snapRoster, snapAbilities, config, state.turno, personalidad);
    if (!accion || accion.tipo !== "atacar") break;
    state = atacar(state, accion.habilidadId, roster, abilities, config, { rng }).state;
  }
  return { ganador: state.ganador, turnos: state.numeroTurno };
}

export interface TasaVictoria {
  id: string;
  /** % de duelos ganados (0-100) contra todo el resto del roster, jugando en ambos asientos. */
  tasa: number;
  duelos: number;
  turnosMedios: number;
}

/** Tasa de victoria de cada animal contra todos los demás (ambos asientos, varias semillas y personalidades). */
export function tasasDeVictoria(
  roster: Reptil[],
  abilities: Habilidad[],
  config: EngineConfig,
  opciones: { semillas?: number; personalidades?: PersonalidadIA[] } = {},
): TasaVictoria[] {
  const semillas = opciones.semillas ?? 2;
  const personalidades = opciones.personalidades ?? ["equilibrada"];
  const acum = new Map<string, { ganados: number; total: number; turnos: number }>();
  for (const r of roster) acum.set(r.id, { ganados: 0, total: 0, turnos: 0 });

  for (const a of roster) {
    for (const b of roster) {
      if (a.id === b.id) continue;
      for (let s = 0; s < semillas; s++) {
        for (const p of personalidades) {
          const { ganador, turnos } = simularDuelo(a.id, b.id, roster, abilities, config, 1000 + s * 7919 + a.numero * 31 + b.numero, p);
          const ra = acum.get(a.id)!;
          const rb = acum.get(b.id)!;
          ra.total++;
          rb.total++;
          ra.turnos += turnos;
          rb.turnos += turnos;
          if (ganador === "A") ra.ganados++;
          else if (ganador === "B") rb.ganados++;
          else {
            ra.ganados += 0.5;
            rb.ganados += 0.5;
          }
        }
      }
    }
  }
  return roster.map((r) => {
    const x = acum.get(r.id)!;
    return { id: r.id, tasa: (x.ganados / x.total) * 100, duelos: x.total, turnosMedios: x.turnos / x.total };
  });
}
