import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { calculateBST, buildReptil } from "./stats";

describe("estadísticas base", () => {
  it("el roster contiene exactamente 40 reptiles", () => {
    expect(REPTILES_BASE).toHaveLength(40);
  });

  it("BST = suma de las 6 estadísticas para todos los personajes", () => {
    for (const base of REPTILES_BASE) {
      const expected = base.hp + base.atk + base.def + base.spd + base.inst + base.adp;
      expect(calculateBST(base)).toBe(expected);
    }
  });

  it("el roster estándar tiene BST = 360", () => {
    for (const base of REPTILES_BASE) {
      expect(calculateBST(base)).toBe(360);
    }
  });

  it("cada reptil tiene exactamente 4 habilidades propias", () => {
    for (const base of REPTILES_BASE) {
      const reptil = buildReptil(base, ABILITIES);
      expect(reptil.habilidades).toHaveLength(4);
    }
  });

  it("hay 8 afinidades representadas con 5 reptiles cada una", () => {
    const counts = new Map<string, number>();
    for (const base of REPTILES_BASE) {
      counts.set(base.afinidad, (counts.get(base.afinidad) ?? 0) + 1);
    }
    expect(counts.size).toBe(8);
    for (const count of counts.values()) {
      expect(count).toBe(5);
    }
  });
});
