import { describe, it, expect } from "vitest";
import type { GameState } from "@/lib/card-game/types";
import { derivarUltimoDerrotado } from "./useGameRoom";

function estadoBase(overrides: Partial<GameState> = {}): GameState {
  return {
    jugadorA: { nombre: "A", mazo: [], activo: { reptilId: "dragon-barbudo", hpActual: 40 }, cementerio: [] },
    jugadorB: { nombre: "B", mazo: [], activo: { reptilId: "caiman-negro", hpActual: 5 }, cementerio: [] },
    turno: "A",
    numeroTurno: 3,
    fase: "combatiendo",
    ganador: null,
    log: [],
    ...overrides,
  };
}

describe("derivarUltimoDerrotado", () => {
  it("null si no hay estado previo", () => {
    expect(derivarUltimoDerrotado(null, { derrotado: true, danoEsperado: 5 } as never)).toBeNull();
  });

  it("null si el resultado no indica derrota", () => {
    const previo = estadoBase();
    expect(derivarUltimoDerrotado(previo, { derrotado: false, danoEsperado: 5 } as never)).toBeNull();
  });

  it("identifica al defensor (lado opuesto al turno previo) como derrotado", () => {
    const previo = estadoBase({ turno: "A" }); // A ataca, B es el defensor
    const resultado = derivarUltimoDerrotado(previo, { derrotado: true, danoEsperado: 5 } as never);
    expect(resultado).toEqual({ lado: "B", reptilId: "caiman-negro" });
  });

  it("funciona igual cuando el turno previo es B (A es el defensor)", () => {
    const previo = estadoBase({ turno: "B" });
    const resultado = derivarUltimoDerrotado(previo, { derrotado: true, danoEsperado: 5 } as never);
    expect(resultado).toEqual({ lado: "A", reptilId: "dragon-barbudo" });
  });

  it("null si el defensor previo ya no tenía reptil activo", () => {
    const previo = estadoBase({ jugadorB: { nombre: "B", mazo: [], activo: null, cementerio: [] } });
    const resultado = derivarUltimoDerrotado(previo, { derrotado: true, danoEsperado: 5 } as never);
    expect(resultado).toBeNull();
  });
});
