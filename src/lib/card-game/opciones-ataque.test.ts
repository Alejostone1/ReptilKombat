import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { crearPartida, invocar } from "./engine";
import { opcionesDeAtaque } from "./opciones-ataque";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));

function partida() {
  let s = crearPartida(["dragon-barbudo"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
  s = invocar(s, "dragon-barbudo", ROSTER);
  return invocar(s, "caiman-negro", ROSTER);
}

describe("opciones de ataque", () => {
  it("con el daño oculto no expone números y el orden es fijo por categoría", () => {
    const op = opcionesDeAtaque(partida(), DEFAULT_ENGINE_CONFIG, true);
    expect(op).toHaveLength(4);
    expect(op.every((o) => o.danoEstimado === 0)).toBe(true);
    expect(op.map((o) => o.habilidad.categoria)).toEqual(["Fisica", "Tecnica", "Control", "Estado"]);
  });

  it("con el daño visible ordena por daño (comportamiento anterior)", () => {
    const op = opcionesDeAtaque(partida(), DEFAULT_ENGINE_CONFIG, false);
    const disp = op.filter((o) => o.disponible);
    for (let i = 1; i < disp.length; i++) expect(disp[i - 1].danoEstimado).toBeGreaterThanOrEqual(disp[i].danoEstimado);
  });
});
