import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { esPesado, esVeloz } from "./estilo-ataque";
import { tasasDeVictoria } from "./simulacion-duelos";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));

describe("equilibrio del roster (simulación de duelos con las reglas reales)", () => {
  // Cada animal se enfrenta a los otros 39, en ambos asientos, con las 4 personalidades de la IA y 2 semillas.
  const tasas = tasasDeVictoria(ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, {
    semillas: 2,
    personalidades: ["equilibrada", "estrategica", "agresiva", "defensiva"],
  });

  it("ninguna carta es claramente superior ni inferior a las demás (tasa de victoria entre 42 % y 58 %)", () => {
    const fuera = tasas.filter((t) => t.tasa < 42 || t.tasa > 58).map((t) => `${t.id}: ${t.tasa.toFixed(1)} %`);
    expect(fuera).toEqual([]);
  });

  it("la tasa media es 50 % (el duelo no favorece a un asiento) y la desviación media es baja", () => {
    const media = tasas.reduce((s, t) => s + t.tasa, 0) / tasas.length;
    const desvMedia = tasas.reduce((s, t) => s + Math.abs(t.tasa - 50), 0) / tasas.length;
    expect(media).toBeCloseTo(50, 1);
    expect(desvMedia).toBeLessThan(3);
  });

  it("los combates tienen un largo razonable (ningún animal promedia más de 16 turnos por duelo)", () => {
    for (const t of tasas) expect(t.turnosMedios).toBeLessThan(16);
  });

  it("los animales pesados pegan menos que los frágiles y veloces con su ataque normal (identidad de cada animal)", () => {
    const potenciaNormal = (id: string) => ABILITIES.find((a) => a.propietarioId === id && a.categoria === "Fisica")!.potencia;
    const media = (ids: string[]) => ids.reduce((s, id) => s + potenciaNormal(id), 0) / ids.length;
    const pesados = REPTILES_BASE.filter((r) => esPesado(r)).map((r) => r.id);
    const veloces = REPTILES_BASE.filter((r) => esVeloz(r.spd)).map((r) => r.id);
    expect(media(pesados)).toBeLessThan(media(veloces));
  });

  it("cada animal tiene ataques distintos en potencia (ya no comparten los mismos números)", () => {
    const potencias = new Set(ABILITIES.filter((a) => a.categoria === "Fisica").map((a) => a.potencia));
    expect(potencias.size).toBeGreaterThan(10);
  });
});
