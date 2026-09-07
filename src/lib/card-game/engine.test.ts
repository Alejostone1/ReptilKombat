import { describe, it, expect, vi, afterEach } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { calculateDamage } from "@/lib/game-engine/damage";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { MAX_CARTAS_MAZO } from "./types";
import { crearPartida, invocar, atacar, puedeInvocar, puedeAtacar, verificarGanador } from "./engine";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));
const dragonBarbudo = ROSTER.find((r) => r.id === "dragon-barbudo")!;
const caimanNegro = ROSTER.find((r) => r.id === "caiman-negro")!;
const habilidadDragon = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo")!;

function nuevaPartida(mazoA: string[], mazoB: string[], nombreA?: string, nombreB?: string) {
  return crearPartida(mazoA, mazoB, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, nombreA, nombreB);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("motor de cartas: invocación", () => {
  it("empieza en fase invocando con el jugador A en turno", () => {
    const state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    expect(state.fase).toBe("invocando");
    expect(state.turno).toBe("A");
    expect(puedeInvocar(state)).toBe(true);
    expect(puedeAtacar(state)).toBe(false);
  });

  it("pasa a fase combatiendo cuando ambos jugadores invocaron", () => {
    let state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER); // turno A -> B
    expect(state.turno).toBe("B");
    state = invocar(state, "caiman-negro", ROSTER); // turno B -> A
    expect(state.fase).toBe("combatiendo");
    expect(state.turno).toBe("A");
    expect(puedeAtacar(state)).toBe(true);
  });

  it(`rechaza mazos vacíos o con más de ${MAX_CARTAS_MAZO} cartas`, () => {
    expect(() => nuevaPartida([], ["caiman-negro"])).toThrow();
    expect(() => nuevaPartida(Array(MAX_CARTAS_MAZO + 1).fill("dragon-barbudo"), ["caiman-negro"])).toThrow();
  });
});

describe("motor de cartas: combate", () => {
  it("el daño de un ataque (sin crítico) coincide exactamente con calculateDamage()", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999); // fuerza "sin crítico" sin importar la probabilidad del reptil
    let state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const esperado = calculateDamage(dragonBarbudo, caimanNegro, habilidadDragon, DEFAULT_ENGINE_CONFIG);
    const resultado = atacar(state, habilidadDragon.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);

    expect(resultado.critico).toBe(false);
    expect(resultado.danoEsperado).toBe(esperado.danoEsperado);
    const hpDefensor = resultado.state.jugadorB.activo?.hpActual ?? 0;
    expect(hpDefensor).toBeCloseTo(caimanNegro.hp - esperado.danoEsperado, 5);
  });

  it("un crítico aplica el multiplicador de crítico configurado", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 < cualquier probabilidad > 0: siempre crítico
    let state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const esperado = calculateDamage(dragonBarbudo, caimanNegro, habilidadDragon, DEFAULT_ENGINE_CONFIG);
    const resultado = atacar(state, habilidadDragon.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);

    expect(resultado.critico).toBe(true);
    expect(resultado.danoEsperado).toBeCloseTo(esperado.danoEsperado * DEFAULT_ENGINE_CONFIG.criticoMultiplicador, 1);
  });

  it("respeta cooldown: una habilidad usada no puede reutilizarse hasta que expire el cooldown", () => {
    let state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const especial = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo" && a.categoria === "Tecnica")!;
    expect(especial.cooldownTurnos).toBeGreaterThan(0);

    const r1 = atacar(state, especial.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    expect(r1.state.jugadorA.activo?.cooldowns[especial.id]).toBeGreaterThan(0);

    // Simula que vuelve a ser el turno de A con el cooldown todavía activo (el propio ataque ya pasó el turno a B).
    const estadoForzado = { ...r1.state, turno: "A" as const };
    expect(() => atacar(estadoForzado, especial.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).toThrow(/cooldown o energía/);
  });

  it("respeta energía: una habilidad no se puede usar sin energía suficiente", () => {
    let state = nuevaPartida(["dragon-barbudo"], ["caiman-negro"]);
    state = invocar(state, "dragon-barbudo", ROSTER);
    state = invocar(state, "caiman-negro", ROSTER);

    const especial = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo" && a.categoria === "Tecnica")!;
    const estadoSinEnergia = {
      ...state,
      jugadorA: { ...state.jugadorA, activo: { ...state.jugadorA.activo!, energiaActual: 0 } },
    };
    expect(() => atacar(estadoSinEnergia, especial.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).toThrow(/cooldown o energía/);
  });

  it("un jugador sin reptil activo ni cartas en el mazo pierde la partida", () => {
    // Mazos de 1 carta cada uno: en cuanto se derrota al único activo, ese jugador pierde.
    let state = nuevaPartida(["geco-de-cola-de-hoja"], ["cocodrilo-del-nilo"]);
    state = invocar(state, "geco-de-cola-de-hoja", ROSTER);
    state = invocar(state, "cocodrilo-del-nilo", ROSTER);

    const habilidadPoderosa = ABILITIES.find((a) => a.propietarioId === "cocodrilo-del-nilo" && a.categoria === "Fisica")!;

    // Repetimos ataques de B contra A hasta que A se quede sin reptiles.
    let guard = 0;
    while (verificarGanador(state) === null && guard < 80) {
      if (state.turno === "B" && puedeAtacar(state)) {
        state = atacar(state, habilidadPoderosa.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG).state;
      } else if (state.turno === "A" && puedeAtacar(state)) {
        // A también ataca para no quedar atascado (su único movimiento legal), siempre con su ataque Físico (sin cooldown).
        const habilidadA = ABILITIES.find((a) => a.propietarioId === "geco-de-cola-de-hoja" && a.categoria === "Fisica")!;
        state = atacar(state, habilidadA.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG).state;
      }
      guard++;
    }

    expect(state.fase).toBe("terminado");
    expect(["A", "B"]).toContain(state.ganador);
  });
});
