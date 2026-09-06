import { REPTILES_BASE } from "./reptiles";
import { ABILITIES } from "./abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import type { Reptil } from "@/types/reptile";

/** Roster completo con campos derivados (BST, índices, habilidades) ya calculados. */
export const ROSTER: Reptil[] = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));

const ROSTER_BY_ID = new Map(ROSTER.map((r) => [r.id, r]));

export function getReptilById(id: string): Reptil | undefined {
  return ROSTER_BY_ID.get(id);
}

export function getAbilitiesByOwner(reptilId: string) {
  return ABILITIES.filter((a) => a.propietarioId === reptilId);
}
