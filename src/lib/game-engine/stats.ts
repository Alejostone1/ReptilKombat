import type { Reptil, ReptilBase } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import { INDEX_WEIGHTS } from "./config";

/** BST = HP + ATK + DEF + SPD + INST + ADP */
export function calculateBST(base: Pick<ReptilBase, "hp" | "atk" | "def" | "spd" | "inst" | "adp">): number {
  return base.hp + base.atk + base.def + base.spd + base.inst + base.adp;
}

/** Índice Ofensivo = (ATK×1.10) + (SPD×0.65) + (INST×0.40) + (ADP×0.25) */
export function calculateOffensiveIndex(base: Pick<ReptilBase, "atk" | "spd" | "inst" | "adp">): number {
  const w = INDEX_WEIGHTS.ofensivo;
  return round1(base.atk * w.atk + base.spd * w.spd + base.inst * w.inst + base.adp * w.adp);
}

/** Índice Defensivo = (HP×0.55) + (DEF×1.15) + (ADP×0.35) */
export function calculateDefensiveIndex(base: Pick<ReptilBase, "hp" | "def" | "adp">): number {
  const w = INDEX_WEIGHTS.defensivo;
  return round1(base.hp * w.hp + base.def * w.def + base.adp * w.adp);
}

/** Índice de Movilidad = (SPD×1.25) + (INST×0.45) */
export function calculateMobilityIndex(base: Pick<ReptilBase, "spd" | "inst">): number {
  const w = INDEX_WEIGHTS.movilidad;
  return round1(base.spd * w.spd + base.inst * w.inst);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Construye un Reptil completo (con campos derivados) a partir de sus datos base
 * y la lista de habilidades del roster. Este es el único lugar del proyecto donde
 * un ReptilBase se convierte en un Reptil "listo para usar" en la interfaz.
 */
export function buildReptil(base: ReptilBase, allAbilities: Habilidad[]): Reptil {
  return {
    ...base,
    bst: calculateBST(base),
    indiceOfensivo: calculateOffensiveIndex(base),
    indiceDefensivo: calculateDefensiveIndex(base),
    indiceMovilidad: calculateMobilityIndex(base),
    habilidades: allAbilities.filter((a) => a.propietarioId === base.id).map((a) => a.id),
  };
}

export function statMax(r: Pick<ReptilBase, "hp" | "atk" | "def" | "spd" | "inst" | "adp">): number {
  return Math.max(r.hp, r.atk, r.def, r.spd, r.inst, r.adp);
}

export function statMin(r: Pick<ReptilBase, "hp" | "atk" | "def" | "spd" | "inst" | "adp">): number {
  return Math.min(r.hp, r.atk, r.def, r.spd, r.inst, r.adp);
}
