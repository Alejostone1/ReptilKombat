import { describe, it, expect } from "vitest";
import { ROSTER } from "@/data/roster";
import { DEFAULT_ENGINE_CONFIG } from "./config";
import { buildMatchupMatrix, calculateMatchup, calculateWinRate } from "./matchups";
import { auditRoster, calculateMetaHealth } from "./balance";

describe("motor de matchups", () => {
  it("un personaje contra sí mismo siempre es 50% / 50%", () => {
    const a = ROSTER[0];
    const result = calculateMatchup(a, a, DEFAULT_ENGINE_CONFIG);
    expect(result.probabilidadAtacante).toBeCloseTo(50, 5);
    expect(result.probabilidadDefensor).toBeCloseTo(50, 5);
  });

  it("las probabilidades de un matchup siempre suman 100", () => {
    const [a, b] = ROSTER;
    const result = calculateMatchup(a, b, DEFAULT_ENGINE_CONFIG);
    expect(result.probabilidadAtacante + result.probabilidadDefensor).toBeCloseTo(100, 5);
  });

  it("la matriz 40x40 es completa y la diagonal es 50", () => {
    const matrix = buildMatchupMatrix(ROSTER, DEFAULT_ENGINE_CONFIG);
    expect(Object.keys(matrix)).toHaveLength(40);
    for (const r of ROSTER) {
      expect(matrix[r.id][r.id]).toBe(50);
      expect(Object.keys(matrix[r.id])).toHaveLength(40);
    }
  });

  it("el win rate de cada personaje está entre 0 y 100", () => {
    const matrix = buildMatchupMatrix(ROSTER, DEFAULT_ENGINE_CONFIG);
    for (const r of ROSTER) {
      const wr = calculateWinRate(r.id, matrix);
      expect(wr).toBeGreaterThanOrEqual(0);
      expect(wr).toBeLessThanOrEqual(100);
    }
  });
});

describe("auditoría de balance", () => {
  it("detecta personajes dominantes y débiles según los umbrales configurados", () => {
    const matrix = buildMatchupMatrix(ROSTER, DEFAULT_ENGINE_CONFIG);
    const audits = auditRoster(ROSTER, matrix, DEFAULT_ENGINE_CONFIG);
    for (const audit of audits) {
      if (audit.winRate > DEFAULT_ENGINE_CONFIG.winRateDominante) {
        expect(audit.alertas.some((a) => a.includes("DOMINANTE"))).toBe(true);
      }
      if (audit.winRate < DEFAULT_ENGINE_CONFIG.winRateDebil) {
        expect(audit.alertas.some((a) => a.includes("DÉBIL"))).toBe(true);
      }
    }
  });

  it("clasifica correctamente el estado general del meta", () => {
    const matrix = buildMatchupMatrix(ROSTER, DEFAULT_ENGINE_CONFIG);
    const audits = auditRoster(ROSTER, matrix, DEFAULT_ENGINE_CONFIG);
    const meta = calculateMetaHealth(audits);
    expect(["BALANCEADO", "REQUIERE_REVISION", "DESEQUILIBRADO"]).toContain(meta);
  });
});
