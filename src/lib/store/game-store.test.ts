import { describe, it, expect, beforeEach } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { useGameStore } from "./game-store";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));

describe("game-store: ultimoDerrotado", () => {
  beforeEach(() => {
    useGameStore.getState().reiniciar();
  });

  it("captura lado y reptilId del defensor cuando un ataque lo derrota", () => {
    useGameStore.setState({ mazoA: ["geco-de-cola-de-hoja"], mazoB: ["cocodrilo-del-nilo"] });
    useGameStore.getState().iniciar("A", "B");
    useGameStore.getState().invocar("geco-de-cola-de-hoja", ROSTER);
    useGameStore.getState().invocar("cocodrilo-del-nilo", ROSTER);

    const habilidadPoderosa = ABILITIES.find((a) => a.propietarioId === "cocodrilo-del-nilo")!;
    const habilidadA = ABILITIES.find((a) => a.propietarioId === "geco-de-cola-de-hoja")!;

    let guard = 0;
    while (useGameStore.getState().state?.fase !== "terminado" && guard < 50) {
      const turno = useGameStore.getState().state?.turno;
      if (turno === "B") {
        useGameStore.getState().atacar(habilidadPoderosa.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
      } else if (turno === "A") {
        useGameStore.getState().atacar(habilidadA.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
      }
      guard++;
    }

    expect(useGameStore.getState().state?.fase).toBe("terminado");
    // El defensor derrotado en el último golpe es quien perdió la partida.
    const ganador = useGameStore.getState().state?.ganador;
    const perdedor = ganador === "A" ? "B" : "A";
    const reptilPerdedor = perdedor === "A" ? "geco-de-cola-de-hoja" : "cocodrilo-del-nilo";
    expect(useGameStore.getState().ultimoDerrotado).toEqual({ lado: perdedor, reptilId: reptilPerdedor });
  });

  it("no marca ultimoDerrotado cuando el golpe no reduce el HP a 0", () => {
    useGameStore.setState({ mazoA: ["dragon-barbudo"], mazoB: ["caiman-negro"] });
    useGameStore.getState().iniciar("A", "B");
    useGameStore.getState().invocar("dragon-barbudo", ROSTER);
    useGameStore.getState().invocar("caiman-negro", ROSTER);

    const habilidadDragon = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo")!;
    useGameStore.getState().atacar(habilidadDragon.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);

    expect(useGameStore.getState().state?.jugadorB.activo).not.toBeNull();
    expect(useGameStore.getState().ultimoDerrotado).toBeNull();
  });

  it("limpiarUltimoDerrotado() lo resetea a null", () => {
    useGameStore.setState({ ultimoDerrotado: { lado: "A", reptilId: "dragon-barbudo" } });
    useGameStore.getState().limpiarUltimoDerrotado();
    expect(useGameStore.getState().ultimoDerrotado).toBeNull();
  });
});
