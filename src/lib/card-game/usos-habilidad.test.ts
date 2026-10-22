import { describe, it, expect } from "vitest";
import { REPTILES_BASE } from "@/data/reptiles";
import { ABILITIES } from "@/data/abilities";
import { buildReptil } from "@/lib/game-engine/stats";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";
import { secuenciaRng } from "@/lib/utils/rng";
import { USOS_MAXIMOS_HABILIDAD, type GameState } from "./types";
import {
  FORCEJEO_ID,
  atacar,
  cambiar,
  crearPartida,
  invocar,
  sinAtaquesUtilizables,
  usosRestantes,
  puedeUsarHabilidad,
} from "./engine";
import { opcionesDeAtaque } from "./opciones-ataque";
import { decidirAccionIA } from "./ai";
import { crearPartidaEquipos, invocarEquipos, atacarEquipos, type EstadoEquipos } from "./engine-equipos";

const ROSTER = REPTILES_BASE.map((b) => buildReptil(b, ABILITIES));
const rng = () => secuenciaRng([0.999, 0.5]);
const fisica = (id: string) => ABILITIES.find((a) => a.propietarioId === id && a.categoria === "Fisica")!;
const de = (id: string, categoria: string) => ABILITIES.find((a) => a.propietarioId === id && a.categoria === categoria)!;

// Rival con muchísima vida para que las pruebas de usos no terminen la partida.
function partida(): GameState {
  let s = crearPartida(["dragon-barbudo", "uromastyx"], ["cocodrilo-del-nilo", "caiman-negro"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
  s = invocar(s, "dragon-barbudo", ROSTER);
  s = invocar(s, "cocodrilo-del-nilo", ROSTER);
  return {
    ...s,
    jugadorB: { ...s.jugadorB, activo: { ...s.jugadorB.activo!, hpActual: 100000 } },
  };
}

/** Juega el ataque indicado para A y un ataque cualquiera de B, y devuelve el estado otra vez en turno de A. */
function turnoDeA(s: GameState, habilidadId: string): GameState {
  let n = atacar(s, habilidadId, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: rng() }).state;
  // B ataca con su normal (sin cooldown) para devolver el turno a A; se le repone la vida para no acabar la partida.
  n = atacar(n, fisica("cocodrilo-del-nilo").id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: rng() }).state;
  return { ...n, jugadorA: { ...n.jugadorA, activo: { ...n.jugadorA.activo!, hpActual: 100000, energiaActual: 1000 } }, jugadorB: { ...n.jugadorB, activo: { ...n.jugadorB.activo!, hpActual: 100000 } } };
}

describe("usos limitados por ataque", () => {
  it(`cada ataque se puede usar exactamente ${USOS_MAXIMOS_HABILIDAD} veces`, () => {
    let s = partida();
    const h = fisica("dragon-barbudo");
    for (let i = 0; i < USOS_MAXIMOS_HABILIDAD; i++) {
      expect(usosRestantes(s.jugadorA.activo!, h)).toBe(USOS_MAXIMOS_HABILIDAD - i);
      s = turnoDeA(s, h.id);
    }
    expect(usosRestantes(s.jugadorA.activo!, h)).toBe(0);
    expect(puedeUsarHabilidad(s.jugadorA.activo!, h)).toBe(false);
    expect(() => atacar(s, h.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).toThrow(/ya no tiene usos/);
  });

  it("los usos se cuentan por separado en cada ataque", () => {
    let s = partida();
    const normal = fisica("dragon-barbudo");
    const control = de("dragon-barbudo", "Control");
    s = turnoDeA(s, normal.id);
    s = turnoDeA(s, normal.id);
    // El control tiene recarga: se repone a mano para aislar la prueba de los usos.
    s = turnoDeA(s, control.id);
    s = { ...s, jugadorA: { ...s.jugadorA, activo: { ...s.jugadorA.activo!, cooldowns: {} } } };
    expect(usosRestantes(s.jugadorA.activo!, normal)).toBe(1);
    expect(usosRestantes(s.jugadorA.activo!, control)).toBe(2);
    expect(usosRestantes(s.jugadorA.activo!, de("dragon-barbudo", "Tecnica"))).toBe(3);
  });

  it("los usos NO se restauran al retirar la carta a la banca y volver a sacarla", () => {
    let s = partida();
    const h = fisica("dragon-barbudo");
    s = turnoDeA(s, h.id);
    s = turnoDeA(s, h.id);
    expect(usosRestantes(s.jugadorA.activo!, h)).toBe(1);
    s = cambiar(s, "uromastyx", ROSTER); // A cambia (gasta su turno)
    s = atacar(s, fisica("cocodrilo-del-nilo").id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: rng() }).state; // B
    s = cambiar(s, "dragon-barbudo", ROSTER); // A vuelve al dragón
    expect(s.jugadorA.activo!.reptilId).toBe("dragon-barbudo");
    expect(usosRestantes(s.jugadorA.activo!, h)).toBe(1);
  });

  it("un estado antiguo sin contador de usos cuenta como 0 usos", () => {
    const s = partida();
    expect(s.jugadorA.activo!.usos).toBeUndefined();
    expect(usosRestantes(s.jugadorA.activo!, fisica("dragon-barbudo"))).toBe(USOS_MAXIMOS_HABILIDAD);
  });

  it("las opciones de la interfaz exponen los usos restantes", () => {
    let s = partida();
    s = turnoDeA(s, fisica("dragon-barbudo").id);
    const op = opcionesDeAtaque(s, DEFAULT_ENGINE_CONFIG, true);
    const normal = op.find((o) => o.habilidad.id === fisica("dragon-barbudo").id)!;
    expect(normal.usosRestantes).toBe(USOS_MAXIMOS_HABILIDAD - 1);
    expect(op.every((o) => o.tier === "neutral")).toBe(true); // sin pistas de ventaja con el daño oculto
  });
});

describe("Forcejeo (ataque de último recurso)", () => {
  function sinUsos(s: GameState): GameState {
    const usos = Object.fromEntries(ABILITIES.filter((a) => a.propietarioId === "dragon-barbudo").map((a) => [a.id, USOS_MAXIMOS_HABILIDAD]));
    return { ...s, jugadorA: { ...s.jugadorA, activo: { ...s.jugadorA.activo!, usos } } };
  }

  it("solo está disponible cuando no queda ningún ataque utilizable", () => {
    const s = partida();
    expect(sinAtaquesUtilizables(s.configuracion, s.jugadorA.activo!)).toBe(false);
    expect(() => atacar(s, FORCEJEO_ID, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG)).toThrow(/Aún tienes ataques/);
  });

  it("con todos los usos agotados aparece, hace daño, no cuenta usos y no atasca la partida", () => {
    const s = sinUsos(partida());
    expect(sinAtaquesUtilizables(s.configuracion, s.jugadorA.activo!)).toBe(true);
    const op = opcionesDeAtaque(s, DEFAULT_ENGINE_CONFIG, true);
    expect(op.map((o) => o.habilidad.id)).toContain(FORCEJEO_ID);
    expect(op.find((o) => o.habilidad.id === FORCEJEO_ID)!.usosRestantes).toBeNull();
    const r = atacar(s, FORCEJEO_ID, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: rng() });
    expect(r.danoEsperado).toBeGreaterThan(0);
    expect(r.state.jugadorA.activo!.usos).toEqual(s.jugadorA.activo!.usos);
  });

  it("la IA también forcejea en vez de quedarse sin jugada", () => {
    const s = sinUsos(partida());
    expect(decidirAccionIA(s, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, "A")).toEqual({ tipo: "atacar", habilidadId: FORCEJEO_ID });
  });
});

describe("usos limitados en 2 vs 2", () => {
  it("el mismo límite de 3 usos y el Forcejeo funcionan en el motor de equipos", () => {
    const mazos = [["dragon-barbudo"], ["cocodrilo-del-nilo"], ["uromastyx"], ["caiman-negro"]];
    let s: EstadoEquipos = crearPartidaEquipos(mazos, ["A1", "B1", "A2", "B2"], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    for (let i = 0; i < 4; i++) s = invocarEquipos(s, s.jugadores[s.turnoIdx].mazo[0], ROSTER);
    const h = fisica("dragon-barbudo");
    const reponer = (e: EstadoEquipos): EstadoEquipos => ({ ...e, jugadores: e.jugadores.map((j) => (j.activo ? { ...j, activo: { ...j.activo, hpActual: 100000 } } : j)) });
    for (let i = 0; i < USOS_MAXIMOS_HABILIDAD; i++) {
      s = reponer(s);
      s = { ...s, turnoIdx: 0 };
      s = atacarEquipos(s, h.id, 1, DEFAULT_ENGINE_CONFIG, { rng: rng() }).state;
    }
    s = reponer({ ...s, turnoIdx: 0 });
    expect(() => atacarEquipos(s, h.id, 1, DEFAULT_ENGINE_CONFIG)).toThrow(/ya no tiene usos/);
    const usos = Object.fromEntries(ABILITIES.filter((a) => a.propietarioId === "dragon-barbudo").map((a) => [a.id, USOS_MAXIMOS_HABILIDAD]));
    const agotado = { ...s, jugadores: s.jugadores.map((j, i) => (i === 0 ? { ...j, activo: { ...j.activo!, usos } } : j)) };
    expect(atacarEquipos(agotado, FORCEJEO_ID, 1, DEFAULT_ENGINE_CONFIG, { rng: rng() }).danoEsperado).toBeGreaterThan(0);
  });
});

describe("esquiva por velocidad", () => {
  const veloz = "geco-crestado"; // spd 90
  const lento = "tortuga-gigante"; // spd 18
  function duelo(atacanteId: string, defensorId: string): GameState {
    let s = crearPartida([atacanteId], [defensorId], ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG);
    s = invocar(s, atacanteId, ROSTER);
    s = invocar(s, defensorId, ROSTER);
    return { ...s, jugadorB: { ...s.jugadorB, activo: { ...s.jugadorB.activo!, hpActual: 100000 } } };
  }

  it("la probabilidad crece con la ventaja de velocidad y tiene tope", async () => {
    const { probabilidadEsquiva, ESQUIVA_MAXIMA } = await import("@/lib/game-engine/esquiva");
    expect(probabilidadEsquiva(40, 50)).toBe(0);
    expect(probabilidadEsquiva(50, 50)).toBe(0);
    expect(probabilidadEsquiva(60, 50)).toBeCloseTo(4);
    expect(probabilidadEsquiva(90, 18)).toBe(ESQUIVA_MAXIMA);
    expect(probabilidadEsquiva(NaN, 10)).toBe(0);
  });

  it("un veloz esquiva al pesado con una tirada baja: sin daño, sin crítico, pero gasta el uso", () => {
    const s = duelo(lento, veloz);
    const h = fisica(lento);
    // tiradas: crítico (0.999 = no), variación (0.5), esquiva (0.01 < 25 %)
    const r = atacar(s, h.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: secuenciaRng([0.999, 0.5, 0.01]) });
    expect(r.esquivado).toBe(true);
    expect(r.danoEsperado).toBe(0);
    expect(r.critico).toBe(false);
    expect(r.state.jugadorB.activo!.hpActual).toBe(100000);
    expect(usosRestantes(r.state.jugadorA.activo!, h)).toBe(USOS_MAXIMOS_HABILIDAD - 1);
  });

  it("con una tirada alta el golpe conecta, y el lento nunca es esquivado por el pesado", () => {
    const h = fisica(lento);
    const conecta = atacar(duelo(lento, veloz), h.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: secuenciaRng([0.999, 0.5, 0.9]) });
    expect(conecta.esquivado).toBe(false);
    expect(conecta.danoEsperado).toBeGreaterThan(0);
    const hv = fisica(veloz);
    const contraLento = atacar(duelo(veloz, lento), hv.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: secuenciaRng([0.999, 0.5, 0]) });
    expect(contraLento.esquivado).toBe(false); // el lento no tiene ventaja de velocidad: no esquiva ni con tirada 0
  });

  it("un ataque de control esquivado no aplica su efecto, y los de apoyo no se esquivan", () => {
    const control = ABILITIES.find((a) => a.propietarioId === lento && a.categoria === "Control")!;
    const r = atacar(duelo(lento, veloz), control.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: secuenciaRng([0.999, 0.5, 0.01]) });
    expect(r.esquivado).toBe(true);
    expect(r.efectoAplicado).toBeNull();
    expect(r.state.jugadorB.activo!.estados).toHaveLength(0);
    const apoyo = ABILITIES.find((a) => a.propietarioId === lento && a.categoria === "Estado")!;
    const a = atacar(duelo(lento, veloz), apoyo.id, ROSTER, ABILITIES, DEFAULT_ENGINE_CONFIG, { rng: secuenciaRng([0.999, 0.5, 0.01]) });
    expect(a.esquivado).toBe(false);
  });
});
