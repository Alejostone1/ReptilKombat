import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { calculateDamage } from "@/lib/game-engine/damage";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { crearPartida, invocar, atacar, puedeInvocar, puedeAtacar } from "./engine";
import { decidirAccionIA } from "./ai";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));

describe("IA del modo de cartas", () => {
  it("no devuelve ninguna acción cuando no es su turno", () => {
    const state = crearPartida(["dragon-barbudo"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    const accion = decidirAccionIA(state, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "B");
    expect(accion).toBeNull();
  });

  it("al invocar, siempre elige un reptil que está realmente en su mazo", () => {
    const state = crearPartida(["dragon-barbudo", "uromastyx"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    expect(puedeInvocar(state)).toBe(true);
    const accion = decidirAccionIA(state, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "A");
    expect(accion?.tipo).toBe("invocar");
    if (accion?.tipo === "invocar") {
      expect(["dragon-barbudo", "uromastyx"]).toContain(accion.reptilId);
    }
  });

  it("al atacar, elige entre las habilidades realmente disponibles de su carta activa", () => {
    let state = crearPartida(["dragon-barbudo"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);
    expect(puedeAtacar(state)).toBe(true);

    const accion = decidirAccionIA(state, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "A");
    expect(accion?.tipo).toBe("atacar");
    const propias = ABILITIES.filter((a) => a.propietarioId === "dragon-barbudo");
    if (accion?.tipo === "atacar") {
      expect(propias.map((a) => a.id)).toContain(accion.habilidadId);
    }
  });

  it("prioriza la habilidad de mayor daño esperado cuando tiene HP saludable", () => {
    let state = crearPartida(["dragon-barbudo"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const atacante = ROSTER.find((r) => r.id === "dragon-barbudo")!;
    const defensor = ROSTER.find((r) => r.id === "caiman-negro")!;
    const propias = ABILITIES.filter((a) => a.propietarioId === "dragon-barbudo");
    const mejorEsperado = propias
      .map((h) => calculateDamage(atacante, defensor, h, DEFAULT_ENGINE_CONFIG).danoEsperado)
      .sort((a, b) => b - a)[0];

    const accion = decidirAccionIA(state, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "A");
    expect(accion?.tipo).toBe("atacar");
    if (accion?.tipo === "atacar") {
      const elegida = propias.find((a) => a.id === accion.habilidadId)!;
      const danoElegido = calculateDamage(atacante, defensor, elegida, DEFAULT_ENGINE_CONFIG).danoEsperado;
      expect(danoElegido).toBe(mejorEsperado);
    }
  });

  it("juega una partida completa contra sí misma sin elegir nunca una acción ilegal", () => {
    let state = crearPartida(["dragon-barbudo", "uromastyx"], ["caiman-negro", "iguana-marina"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    let guard = 0;
    while (state.fase !== "terminado" && guard < 200) {
      const accion = decidirAccionIA(state, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, state.turno);
      expect(accion).not.toBeNull();
      if (accion?.tipo === "invocar") {
        state = invocar(state, accion.reptilId, ROSTER);
      } else if (accion?.tipo === "atacar") {
        state = atacar(state, accion.habilidadId, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG).state;
      }
      guard++;
    }
    expect(state.fase).toBe("terminado");
    expect(["A", "B"]).toContain(state.ganador);
  });
});
