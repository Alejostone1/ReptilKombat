import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { calculateDamage } from "@/lib/game-engine/damage";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { clasificarDano, recordarAtaque } from "./memoria-ataques";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));

describe("memoria de ataques", () => {
  it("clasifica por % de la vida máxima del objetivo", () => {
    expect(clasificarDano(5, 100)).toBe("debil");
    expect(clasificarDano(15, 100)).toBe("medio");
    expect(clasificarDano(30, 100)).toBe("fuerte");
    expect(clasificarDano(0, 100)).toBe("efecto");
  });

  it("recordarAtaque no muta la memoria anterior", () => {
    const m = {};
    const n = recordarAtaque(m, "x", "fuerte");
    expect(m).toEqual({});
    expect(n).toEqual({ x: "fuerte" });
  });

  it("con el roster real los tres niveles son frecuentes (no todo cae en uno solo)", () => {
    const conteo = { debil: 0, medio: 0, fuerte: 0, efecto: 0 };
    for (const atacante of ROSTER) {
      for (const defensor of ROSTER) {
        if (atacante.id === defensor.id) continue;
        for (const hab of ABILITIES.filter((a) => a.propietarioId === atacante.id)) {
          const d = calculateDamage(atacante, defensor, hab, DEFAULT_ENGINE_CONFIG);
          conteo[clasificarDano(d.danoEsperado, defensor.hp)]++;
        }
      }
    }
    const dano = conteo.debil + conteo.medio + conteo.fuerte;
    for (const k of ["debil", "medio", "fuerte"] as const) {
      expect(conteo[k] / dano).toBeGreaterThan(0.15);
    }
  });
});
