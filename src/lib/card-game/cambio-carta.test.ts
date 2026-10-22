import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { secuenciaRng } from "@/lib/utils/rng";
import { FORCEJEO_ID, habilidadesDeCarta, puedeUsarHabilidad, crearPartida, invocar, atacar, cambiar, puedeCambiar, puedeInvocar, bancaDe, toPublicView, verificarGanador } from "./engine";
import { decidirAccionIA } from "./ai";
import type { GameState } from "./types";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));
const SIN_CRITICO = () => secuenciaRng([0.999, 0.5]);

function partida(mazoA = ["dragon-barbudo", "uromastyx"], mazoB = ["caiman-negro", "cocodrilo-del-nilo"]): GameState {
  let s = crearPartida(mazoA, mazoB, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
  s = invocar(s, mazoA[0], ROSTER);
  return invocar(s, mazoB[0], ROSTER);
}

const fisica = (id: string) => ABILITIES.find((a) => a.propietarioId === id && a.categoria === "Fisica")!;
// Golpea con el ataque de mayor potencia que pueda usar y, si ninguno puede, con el Forcejeo de último recurso.
const golpear = (s: GameState) => {
  const activo = (s.turno === "A" ? s.jugadorA : s.jugadorB).activo!;
  const mejor = habilidadesDeCarta(s.configuracion, activo)
    .filter((h) => puedeUsarHabilidad(activo, h))
    .sort((a, b) => b.potencia - a.potencia)[0];
  return atacar(s, mejor?.id ?? FORCEJEO_ID, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: SIN_CRITICO() }).state;
};

describe("cambio de carta", () => {
  it("no se puede cambiar antes del combate ni sin carta de repuesto", () => {
    const s0 = crearPartida(["dragon-barbudo", "uromastyx"], ["caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    expect(puedeCambiar(s0)).toBe(false);
    const sSolo = partida(["dragon-barbudo"], ["caiman-negro"]);
    expect(puedeCambiar(sSolo)).toBe(false);
    expect(() => cambiar(sSolo, "dragon-barbudo", ROSTER)).toThrow();
  });

  it("consume el turno y deja la activa en la banca con su vida actual", () => {
    let s = partida();
    s = golpear(s); // A ataca a B
    s = golpear(s); // B ataca a A
    expect(s.turno).toBe("A");
    const hpAntes = s.jugadorA.activo!.hpActual;
    expect(hpAntes).toBeLessThan(ROSTER.find((r) => r.id === "dragon-barbudo")!.hp);

    const n = cambiar(s, "uromastyx", ROSTER);
    expect(n.turno).toBe("B");
    expect(n.jugadorA.activo?.reptilId).toBe("uromastyx");
    expect(n.jugadorA.activo?.hpActual).toBe(ROSTER.find((r) => r.id === "uromastyx")!.hp); // del mazo: vida completa
    expect(bancaDe(n.jugadorA).map((c) => c.reptilId)).toEqual(["dragon-barbudo"]);
    expect(bancaDe(n.jugadorA)[0].hpActual).toBe(hpAntes); // conserva la vida que tenía
    expect(n.jugadorA.mazo).not.toContain("uromastyx");
    expect(n.log.at(-1)?.tipo).toBe("cambio");
  });

  it("volver a una carta de la banca la trae con la vida que conservaba, y rechaza cambios inválidos", () => {
    let s = partida();
    s = golpear(s);
    const hpB = s.jugadorB.activo!.hpActual; // B recibió daño
    s = cambiar(s, "cocodrilo-del-nilo", ROSTER); // turno de B: cambia
    expect(bancaDe(s.jugadorB)[0].hpActual).toBe(hpB);
    s = cambiar(s, "uromastyx", ROSTER); // A cambia
    expect(() => cambiar(s, "cocodrilo-del-nilo", ROSTER)).toThrow(/ya está en combate/);
    s = cambiar(s, "caiman-negro", ROSTER); // B vuelve a la del banco
    expect(s.jugadorB.activo?.hpActual).toBe(hpB);
    expect(() => cambiar(s, "no-existe", ROSTER)).toThrow();
  });

  it("al retirarse pierde veneno/buffs/aturdimiento, pero conserva cooldowns", () => {
    let s = partida();
    const especial = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo" && a.categoria === "Tecnica")!;
    s = atacar(s, especial.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: SIN_CRITICO() }).state;
    s = golpear(s);
    const conEstado: GameState = {
      ...s,
      jugadorA: { ...s.jugadorA, activo: { ...s.jugadorA.activo!, estados: [{ tipo: "veneno", turnosRestantes: 3, magnitud: 5 }], aturdidoTurnos: 1 } },
    };
    const retirada = bancaDe(cambiar(conEstado, "uromastyx", ROSTER).jugadorA)[0];
    expect(retirada.estados).toEqual([]);
    expect(retirada.aturdidoTurnos).toBe(0);
    expect(Object.keys(retirada.cooldowns).length).toBeGreaterThan(0);
  });

  it("al caer la activa, el reemplazo sale de la banca y no se pierde mientras quede banca", () => {
    let s = partida(["geco-de-cola-de-hoja", "uromastyx"], ["cocodrilo-del-nilo", "caiman-negro"]);
    s = cambiar(s, "uromastyx", ROSTER); // A: el geco pasa a la banca; entra uromastyx
    let guard = 0;
    while (s.jugadorA.activo && guard++ < 60) {
      s = golpear(s);
    }
    expect(s.jugadorA.cementerio).toContain("uromastyx");
    expect(bancaDe(s.jugadorA)).toHaveLength(1);
    expect(s.fase).toBe("combatiendo");
    expect(verificarGanador(s)).toBeNull();
    // Le toque a quien le toque, A debe poder invocar y solo desde la banca.
    const sA: GameState = { ...s, turno: "A" };
    expect(puedeInvocar(sA)).toBe(true);
    expect(decidirAccionIA(sA, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "A")).toEqual({ tipo: "invocar", reptilId: "geco-de-cola-de-hoja" });
    const n = invocar(sA, "geco-de-cola-de-hoja", ROSTER);
    expect(n.jugadorA.activo?.reptilId).toBe("geco-de-cola-de-hoja");
    expect(bancaDe(n.jugadorA)).toHaveLength(0);
  });

  it("estados antiguos sin banca siguen funcionando", () => {
    const s = partida();
    const viejo: GameState = { ...s, jugadorA: { ...s.jugadorA, banca: undefined }, jugadorB: { ...s.jugadorB, banca: undefined } };
    expect(bancaDe(viejo.jugadorA)).toEqual([]);
    expect(puedeCambiar(viejo)).toBe(true);
    expect(() => atacar(viejo, fisica("dragon-barbudo").id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).not.toThrow();
  });

  it("la vista pública incluye la banca de ambos lados y oculta solo el mazo del rival", () => {
    let s = partida();
    s = cambiar(s, "uromastyx", ROSTER); // A cambia
    s = cambiar(s, "cocodrilo-del-nilo", ROSTER); // B cambia
    const vistaA = toPublicView(s, "A");
    expect(vistaA.jugadorB.mazo.every((id) => id === "?")).toBe(true);
    expect(bancaDe(vistaA.jugadorB).map((c) => c.reptilId)).toEqual(["caiman-negro"]);
    expect(vistaA.configuracion.reptiles["caiman-negro"]).toBeDefined();
    expect(vistaA.configuracion.reptiles["dragon-barbudo"]).toBeDefined();
  });
});
