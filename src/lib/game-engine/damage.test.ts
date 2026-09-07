import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { calculateDamage } from "./damage";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));

describe("ritmo de combate: regresión de golpes para derrotar", () => {
  it("con la config por defecto, un ataque Normal promedia entre 3 y 6 golpes para derrotar a un rival de la muestra del roster", () => {
    // Muestra representativa: cada reptil contra el que está 20 posiciones más adelante en el roster
    // (mezcla afinidades/roles distintos). Se usa el ataque "Fisica" (Normal) porque es el único
    // siempre disponible sin cooldown/energía — un límite CONSERVADOR: mezclando Especial/Control
    // en una partida real el ritmo es igual o más rápido, nunca más lento que este número.
    const golpes: number[] = [];
    for (let i = 0; i < ROSTER.length; i++) {
      const atacante = ROSTER[i];
      const defensor = ROSTER[(i + 20) % ROSTER.length];
      const habilidad = ABILITIES.find((a) => a.propietarioId === atacante.id && a.categoria === "Fisica")!;
      const resultado = calculateDamage(atacante, defensor, habilidad, DEFAULT_ENGINE_CONFIG);
      golpes.push(resultado.golpesParaDerrotar);
    }

    const promedio = golpes.reduce((a, b) => a + b, 0) / golpes.length;
    expect(promedio).toBeGreaterThanOrEqual(3);
    expect(promedio).toBeLessThanOrEqual(6);
  });
});
