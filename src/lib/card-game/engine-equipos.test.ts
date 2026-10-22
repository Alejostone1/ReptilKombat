import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { secuenciaRng } from "@/lib/utils/rng";
import {
  crearPartidaEquipos,
  invocarEquipos,
  atacarEquipos,
  cambiarEquipos,
  puedeAtacarEquipos,
  puedeInvocarEquipos,
  objetivosValidos,
  toPublicViewEquipos,
  verificarGanadorEquipos,
  equipoDe,
  rivalesDe,
  companeroDe,
  indiceDeAsiento,
  asientoDeIndice,
  esEstadoEquipos,
  type EstadoEquipos,
} from "./engine-equipos";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));
const SIN_CRITICO = () => secuenciaRng([0.999, 0.5]);
const fisica = (id: string) => ABILITIES.find((a) => a.propietarioId === id && a.categoria === "Fisica")!;

// A1=dragon-barbudo, B1=caiman-negro, A2=uromastyx, B2=cocodrilo-del-nilo (+ una carta de repuesto cada uno)
const MAZOS = [
  ["dragon-barbudo", "geco-de-cola-de-hoja"],
  ["caiman-negro", "varano-del-desierto"],
  ["uromastyx", "lagarto-cornudo"],
  ["cocodrilo-del-nilo", "piton-reticulada"],
];
const NOMBRES = ["A1", "B1", "A2", "B2"];

function nueva(mazos = MAZOS): EstadoEquipos {
  return crearPartidaEquipos(mazos, NOMBRES, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
}
function enCombate(mazos = MAZOS): EstadoEquipos {
  let s = nueva(mazos);
  for (let i = 0; i < 4; i++) s = invocarEquipos(s, s.jugadores[s.turnoIdx].mazo[0], ROSTER);
  return s;
}
const golpear = (s: EstadoEquipos, objetivo: number) => {
  const idCarta = s.jugadores[s.turnoIdx].activo!.reptilId;
  return atacarEquipos(s, fisica(idCarta).id, objetivo, DEFAULT_ENGINE_CONFIG, { rng: SIN_CRITICO() });
};

describe("2 vs 2: asientos y equipos", () => {
  it("A1=0, B1=1, A2=2, B2=3 y los helpers son coherentes", () => {
    expect(indiceDeAsiento("A", 1)).toBe(0);
    expect(indiceDeAsiento("B", 1)).toBe(1);
    expect(indiceDeAsiento("A", 2)).toBe(2);
    expect(indiceDeAsiento("B", 2)).toBe(3);
    for (let i = 0; i < 4; i++) {
      const { equipo, asiento } = asientoDeIndice(i);
      expect(indiceDeAsiento(equipo, asiento)).toBe(i);
      expect(equipoDe(companeroDe(i))).toBe(equipoDe(i));
      rivalesDe(i).forEach((r) => expect(equipoDe(r)).not.toBe(equipoDe(i)));
    }
  });

  it("valida 4 jugadores y mazos de 1–2 cartas", () => {
    expect(() => crearPartidaEquipos(MAZOS.slice(0, 3), NOMBRES.slice(0, 3), ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).toThrow();
    expect(() => nueva([["dragon-barbudo", "uromastyx", "caiman-negro"], ...MAZOS.slice(1)])).toThrow();
    expect(() => nueva([[], ...MAZOS.slice(1)])).toThrow();
    expect(esEstadoEquipos(nueva())).toBe(true);
    expect(esEstadoEquipos({ jugadorA: {} })).toBe(false);
  });
});

describe("2 vs 2: turnos", () => {
  it("la invocación rota A1→B1→A2→B2 y luego empieza el combate con A1", () => {
    let s = nueva();
    const orden: number[] = [];
    for (let i = 0; i < 4; i++) {
      expect(puedeInvocarEquipos(s)).toBe(true);
      orden.push(s.turnoIdx);
      s = invocarEquipos(s, s.jugadores[s.turnoIdx].mazo[0], ROSTER);
    }
    expect(orden).toEqual([0, 1, 2, 3]);
    expect(s.fase).toBe("combatiendo");
    expect(s.turnoIdx).toBe(0);
    expect(puedeAtacarEquipos(s)).toBe(true);
  });

  it("el turno alterna equipos en combate", () => {
    let s = enCombate();
    const turnos: number[] = [];
    for (let i = 0; i < 4; i++) {
      turnos.push(s.turnoIdx);
      s = golpear(s, rivalesDe(s.turnoIdx)[0]).state;
    }
    expect(turnos).toEqual([0, 1, 2, 3]);
  });
});

describe("2 vs 2: ataque y objetivos", () => {
  it("solo se puede atacar a un rival con carta activa y el daño solo toca al objetivo", () => {
    const s = enCombate();
    expect(objetivosValidos(s)).toEqual([1, 3]);
    expect(() => atacarEquipos(s, fisica("dragon-barbudo").id, 2, DEFAULT_ENGINE_CONFIG)).toThrow(/rival/); // compañero
    expect(() => atacarEquipos(s, fisica("dragon-barbudo").id, 0, DEFAULT_ENGINE_CONFIG)).toThrow(/rival/); // a sí mismo
    const r = golpear(s, 3);
    expect(r.objetivoIdx).toBe(3);
    expect(r.state.jugadores[3].activo!.hpActual).toBeLessThan(s.jugadores[3].activo!.hpActual);
    expect(r.state.jugadores[1].activo!.hpActual).toBe(s.jugadores[1].activo!.hpActual); // el otro rival intacto
    expect(r.tier).toBeDefined();
  });

  it("rechaza habilidades ajenas y en cooldown", () => {
    const s = enCombate();
    expect(() => atacarEquipos(s, fisica("caiman-negro").id, 1, DEFAULT_ENGINE_CONFIG)).toThrow(/no pertenece/);
    const especial = ABILITIES.find((a) => a.propietarioId === "dragon-barbudo" && a.categoria === "Tecnica")!;
    const r = atacarEquipos(s, especial.id, 1, DEFAULT_ENGINE_CONFIG, { rng: SIN_CRITICO() });
    expect(r.state.jugadores[0].activo!.cooldowns[especial.id]).toBeGreaterThan(0);
  });
});

describe("2 vs 2: derrotas, reemplazo y victoria", () => {
  it("cuando cae una carta, ese jugador debe invocar su reemplazo en su turno", () => {
    let s = enCombate();
    let guard = 0;
    while (s.jugadores[1].activo?.reptilId === "caiman-negro" && guard++ < 80) {
      const objetivo = s.turnoIdx % 2 === 0 ? 1 : (s.turnoIdx === 1 ? 0 : 2);
      s = golpear(s, objetivo).state;
    }
    expect(s.jugadores[1].cementerio).toContain("caiman-negro");
    // En algún momento B1 queda sin activa y le toca invocar su carta de mazo.
    let g2 = 0;
    while (!(s.turnoIdx === 1 && puedeInvocarEquipos(s)) && s.fase !== "terminado" && g2++ < 20) {
      s = golpear(s, rivalesDe(s.turnoIdx).find((r) => s.jugadores[r].activo)!).state;
    }
    if (s.fase !== "terminado") {
      expect(puedeInvocarEquipos(s)).toBe(true);
      expect(puedeAtacarEquipos(s)).toBe(false);
      s = invocarEquipos(s, "varano-del-desierto", ROSTER);
      expect(s.jugadores[1].activo?.reptilId).toBe("varano-del-desierto");
    }
  });

  it("un jugador sin cartas se salta y gana el equipo cuando sus rivales se quedan sin cartas", () => {
    const mazos = [["dragon-barbudo"], ["geco-de-cola-de-hoja"], ["uromastyx"], ["geco-de-cola-de-hoja"]];
    let s = enCombate(mazos);
    let guard = 0;
    while (s.fase !== "terminado" && guard++ < 300) {
      const rival = rivalesDe(s.turnoIdx).find((r) => s.jugadores[r].activo);
      if (puedeInvocarEquipos(s)) s = invocarEquipos(s, s.jugadores[s.turnoIdx].mazo[0], ROSTER);
      else s = golpear(s, rival!).state;
    }
    expect(s.fase).toBe("terminado");
    expect(s.ganador).toBe("A"); // dragón + uromastyx contra dos gecos
    expect(verificarGanadorEquipos(s)).toBe("A");
    // Tras terminar nadie puede actuar.
    expect(puedeAtacarEquipos(s)).toBe(false);
    expect(puedeInvocarEquipos(s)).toBe(false);
  });
});

describe("2 vs 2: cambio de carta", () => {
  it("cambiar consume el turno y deja la activa en la banca con su vida", () => {
    let s = enCombate();
    s = golpear(s, 1).state; // A1 ataca a B1
    s = golpear(s, 0).state; // B1 ataca a A1
    s = golpear(s, 1).state; // A2 ataca a B1
    s = golpear(s, 2).state; // B2 ataca a A2
    expect(s.turnoIdx).toBe(0);
    const hp = s.jugadores[0].activo!.hpActual;
    const n = cambiarEquipos(s, "geco-de-cola-de-hoja", ROSTER);
    expect(n.turnoIdx).toBe(1);
    expect(n.jugadores[0].activo?.reptilId).toBe("geco-de-cola-de-hoja");
    expect(n.jugadores[0].banca?.[0].hpActual).toBe(hp);
  });
});

describe("2 vs 2: vista pública", () => {
  it("oculta los mazos de todos los demás (también el del compañero) y mantiene el propio", () => {
    const s = enCombate();
    const v = toPublicViewEquipos(s, 0);
    expect(v.jugadores[0].mazo).toEqual(s.jugadores[0].mazo);
    for (const i of [1, 2, 3]) expect(v.jugadores[i].mazo.every((id) => id === "?")).toBe(true);
    // El snapshot no filtra reptiles ocultos de los demás.
    expect(v.configuracion.reptiles["piton-reticulada"]).toBeUndefined();
    expect(v.configuracion.reptiles["varano-del-desierto"]).toBeUndefined();
    expect(v.configuracion.reptiles["caiman-negro"]).toBeDefined(); // activa de un rival
    expect(v.configuracion.reptiles["geco-de-cola-de-hoja"]).toBeDefined(); // mi propio mazo
  });
});
