import { describe, it, expect, beforeEach } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { useGameStore } from "./game-store";
import { FORCEJEO_ID, habilidadesDeCarta, puedeUsarHabilidad } from "@/lib/card-game/engine";

const ROSTER = REPTILES_BASE.map((base) => buildReptil(base, ABILITIES));

describe("game-store: ultimoDerrotado", () => {
  beforeEach(() => {
    useGameStore.getState().reiniciar();
  });

  it("captura lado y reptilId del defensor cuando un ataque lo derrota", () => {
    useGameStore.setState({ mazoA: ["geco-de-cola-de-hoja"], mazoB: ["cocodrilo-del-nilo"] });
    useGameStore.getState().iniciar("A", "B", ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    useGameStore.getState().invocar("geco-de-cola-de-hoja", ROSTER);
    useGameStore.getState().invocar("cocodrilo-del-nilo", ROSTER);

    // Cada turno usa el ataque de mayor potencia que pueda usar (cada uno tiene 3 usos) y, si no le queda ninguno, el Forcejeo.
    let guard = 0;
    while (useGameStore.getState().state?.fase !== "terminado" && guard < 80) {
      const s = useGameStore.getState().state!;
      const activo = (s.turno === "A" ? s.jugadorA : s.jugadorB).activo!;
      const mejor = habilidadesDeCarta(s.configuracion, activo)
        .filter((h) => puedeUsarHabilidad(activo, h))
        .sort((a, b) => b.potencia - a.potencia)[0];
      useGameStore.getState().atacar(mejor?.id ?? FORCEJEO_ID, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
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
    useGameStore.getState().iniciar("A", "B", ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    useGameStore.getState().invocar("dragon-barbudo", ROSTER);
    useGameStore.getState().invocar("caiman-negro", ROSTER);

    const habilidadDragon = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo" && a.categoria === "Fisica")!;
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
