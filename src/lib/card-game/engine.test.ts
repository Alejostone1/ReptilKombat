import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { calculateDamage } from "@/lib/game-engine/damage";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { crearPartida, invocar, atacar, puedeInvocar, puedeAtacar, verificarGanador } from "./engine";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));
const dragonBarbudo = ROSTER.find((r) => r.id === "dragon-barbudo")!;
const caimanNegro = ROSTER.find((r) => r.id === "caiman-negro")!;
const habilidadDragon = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo")!;

describe("motor de cartas: invocación", () => {
  it("empieza en fase invocando con el jugador A en turno", () => {
    const state = crearPartida(["dragon-barbudo"], ["caiman-negro"]);
    expect(state.fase).toBe("invocando");
    expect(state.turno).toBe("A");
    expect(puedeInvocar(state)).toBe(true);
    expect(puedeAtacar(state)).toBe(false);
  });

  it("pasa a fase combatiendo cuando ambos jugadores invocaron", () => {
    let state = crearPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER); // turno A -> B
    expect(state.turno).toBe("B");
    state = invocar(state, "caiman-negro", ROSTER); // turno B -> A
    expect(state.fase).toBe("combatiendo");
    expect(state.turno).toBe("A");
    expect(puedeAtacar(state)).toBe(true);
  });

  it("rechaza mazos vacíos o con más de 5 cartas", () => {
    expect(() => crearPartida([], ["caiman-negro"])).toThrow();
    expect(() => crearPartida(Array(6).fill("dragon-barbudo"), ["caiman-negro"])).toThrow();
  });
});

describe("motor de cartas: combate", () => {
  it("el daño de un ataque coincide exactamente con calculateDamage()", () => {
    let state = crearPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const esperado = calculateDamage(dragonBarbudo, caimanNegro, habilidadDragon, DEFAULT_ENGINE_CONFIG);
    const resultado = atacar(state, habilidadDragon.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);

    expect(resultado.danoEsperado).toBe(esperado.danoEsperado);
    const hpDefensor = resultado.state.jugadorB.activo?.hpActual ?? 0;
    expect(hpDefensor).toBeCloseTo(caimanNegro.hp - esperado.danoEsperado, 5);
  });

  it("un jugador sin reptil activo ni cartas en el mazo pierde la partida", () => {
    // Mazos de 1 carta cada uno: en cuanto se derrota al único activo, ese jugador pierde.
    let state = crearPartida(["geco-de-cola-de-hoja"], ["cocodrilo-del-nilo"]);
    state = invocar(state, "geco-de-cola-de-hoja", ROSTER);
    state = invocar(state, "cocodrilo-del-nilo", ROSTER);

    const habilidadPoderosa = ABILITIES.find((a) => a.propietarioId === "cocodrilo-del-nilo")!;

    // Repetimos ataques de B contra A hasta que A se quede sin reptiles.
    let guard = 0;
    while (verificarGanador(state) === null && guard < 50) {
      if (state.turno === "B" && puedeAtacar(state)) {
        state = atacar(state, habilidadPoderosa.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG).state;
      } else if (state.turno === "A" && puedeAtacar(state)) {
        // A también ataca para no quedar atascado (su único movimiento legal)
        const habilidadA = ABILITIES.find((a) => a.propietarioId === "geco-de-cola-de-hoja")!;
        state = atacar(state, habilidadA.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG).state;
      }
      guard++;
    }

    expect(state.fase).toBe("terminado");
    expect(["A", "B"]).toContain(state.ganador);
  });
});
