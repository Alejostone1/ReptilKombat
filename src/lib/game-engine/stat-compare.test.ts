import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "./stats";
import { normalizarStat, maximosDelRoster, nivelStat, STATS_COMPARABLES } from "./stat-compare";

describe("normalizarStat", () => {
  it("devuelve el porcentaje respecto al máximo, acotado a 0–100", () => {
    expect(normalizarStat(50, 100)).toBe(50);
    expect(normalizarStat(100, 100)).toBe(100);
    expect(normalizarStat(150, 100)).toBe(100);
    expect(normalizarStat(-5, 100)).toBe(0);
  });

  it("no revienta con máximos o valores inválidos", () => {
    expect(normalizarStat(10, 0)).toBe(0);
    expect(normalizarStat(Number.NaN, 100)).toBe(0);
    expect(normalizarStat(10, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("maximosDelRoster", () => {
  const roster = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));

  it("calcula el máximo real de cada stat comparable", () => {
    const maximos = maximosDelRoster(roster);
    for (const k of STATS_COMPARABLES) {
      expect(maximos[k]).toBe(Math.max(...roster.map((r) => r[k])));
    }
  });

  it("el mejor del roster en cada stat marca 100 % y nadie supera 100 %", () => {
    const maximos = maximosDelRoster(roster);
    for (const k of STATS_COMPARABLES) {
      const porcentajes = roster.map((r) => normalizarStat(r[k], maximos[k]));
      expect(Math.max(...porcentajes)).toBe(100);
      expect(Math.min(...porcentajes)).toBeGreaterThanOrEqual(0);
    }
  });

  it("dos cartas distintas se distinguen en al menos una barra (se pueden comparar)", () => {
    const maximos = maximosDelRoster(roster);
    const tanque = roster.find((r) => r.id === "tortuga-gigante")!;
    const veloz = roster.find((r) => r.id === "geco-crestado")!;
    const barras = (r: typeof tanque) => STATS_COMPARABLES.map((k) => normalizarStat(r[k], maximos[k]));
    expect(barras(tanque)).not.toEqual(barras(veloz));
    expect(normalizarStat(tanque.hp, maximos.hp)).toBeGreaterThan(normalizarStat(veloz.hp, maximos.hp));
    expect(normalizarStat(veloz.spd, maximos.spd)).toBeGreaterThan(normalizarStat(tanque.spd, maximos.spd));
  });
});

describe("nivelStat", () => {
  it("clasifica en bajo / medio / alto", () => {
    expect(nivelStat(10)).toBe("bajo");
    expect(nivelStat(44)).toBe("bajo");
    expect(nivelStat(45)).toBe("medio");
    expect(nivelStat(74)).toBe("medio");
    expect(nivelStat(75)).toBe("alto");
    expect(nivelStat(100)).toBe("alto");
  });
});
