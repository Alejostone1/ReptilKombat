import { describe, it, expect } from "vitest";
import { AFFINITIES } from "@/types/affinity";
import { auditAffinityMatrix, getAffinityMultiplier, getAffinityTier } from "./affinities";
import { DEFAULT_ENGINE_CONFIG } from "./config";

describe("matriz de afinidades", () => {
  it("cada afinidad tiene exactamente 2 ventajas, 2 debilidades y 4 neutrales", () => {
    const audits = auditAffinityMatrix();
    expect(audits).toHaveLength(8);
    for (const audit of audits) {
      expect(audit.ventajas).toHaveLength(2);
      expect(audit.debilidades).toHaveLength(2);
      expect(audit.neutrales).toHaveLength(4);
      expect(audit.indiceDominancia).toBe(0);
      expect(audit.estado).toBe("OK");
    }
  });

  it("el enfrentamiento en espejo siempre es neutral", () => {
    for (const afinidad of AFFINITIES) {
      expect(getAffinityTier(afinidad, afinidad)).toBe("neutral");
    }
  });

  it("la matriz es antisimétrica: si A vence a B, B no puede vencer a A", () => {
    for (const a of AFFINITIES) {
      for (const b of AFFINITIES) {
        if (a === b) continue;
        const tierAB = getAffinityTier(a, b);
        const tierBA = getAffinityTier(b, a);
        if (tierAB === "ventaja") expect(tierBA).not.toBe("ventaja");
        if (tierAB === "desventaja") expect(tierBA).not.toBe("desventaja");
      }
    }
  });

  it("getAffinityMultiplier usa la configuración vigente, no números fijos", () => {
    const customConfig = { ...DEFAULT_ENGINE_CONFIG, ventaja: 2, desventaja: 0.5 };
    const [afinidadA, afinidadB] = AFFINITIES;
    const tier = getAffinityTier(afinidadA, afinidadB);
    const expected = tier === "ventaja" ? 2 : tier === "desventaja" ? 0.5 : customConfig.neutral;
    expect(getAffinityMultiplier(afinidadA, afinidadB, customConfig)).toBe(expected);
  });
});
