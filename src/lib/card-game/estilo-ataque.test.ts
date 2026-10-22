import { describe, it, expect } from "vitest";
import { AFFINITIES } from "@/types/affinity";
import { REPTILES_BASE } from "@/data/reptiles";
import { ETAPAS, duracionTotal, esPesado, esVeloz, estiloDeAtaque, resultadoRevelado } from "./estilo-ataque";

describe("estilo de animación", () => {
  it("el resultado solo se revela desde el impacto", () => {
    expect(ETAPAS).toEqual(["preparacion", "anticipacion", "ejecucion", "impacto", "reaccion", "recuperacion"]);
    expect(resultadoRevelado("preparacion")).toBe(false);
    expect(resultadoRevelado("anticipacion")).toBe(false);
    expect(resultadoRevelado("ejecucion")).toBe(false);
    expect(resultadoRevelado("impacto")).toBe(true);
    expect(resultadoRevelado("recuperacion")).toBe(true);
    expect(resultadoRevelado(null)).toBe(true);
  });

  it("cada tipo de animal tiene su propio color y partículas", () => {
    const estilos = AFFINITIES.map((a) => estiloDeAtaque(a, "Fisica"));
    expect(new Set(estilos.map((e) => e.color)).size).toBe(AFFINITIES.length);
    expect(new Set(estilos.map((e) => e.particulas)).size).toBe(AFFINITIES.length);
  });

  it("la categoría decide el desplazamiento", () => {
    expect(estiloDeAtaque("Térmico", "Fisica").trayecto).toBe("embestida");
    expect(estiloDeAtaque("Térmico", "Tecnica").trayecto).toBe("proyectil");
    expect(estiloDeAtaque("Acorazado", "Tecnica").trayecto).toBe("embestida"); // el blindado embiste, no dispara
    expect(estiloDeAtaque("Térmico", "Control").trayecto).toBe("aura");
    expect(estiloDeAtaque("Térmico", "Estado").trayecto).toBe("aura");
  });

  it("los animales pesados son más lentos y contundentes que los veloces", () => {
    const pesado = estiloDeAtaque("Acorazado", "Fisica", { pesado: true });
    const veloz = estiloDeAtaque("Ágil", "Fisica", { veloz: true });
    const normal = estiloDeAtaque("Térmico", "Fisica");
    expect(duracionTotal(pesado)).toBeGreaterThan(duracionTotal(normal));
    expect(duracionTotal(veloz)).toBeLessThan(duracionTotal(normal));
    expect(pesado.temblor).toBeGreaterThan(veloz.temblor);
    expect(veloz.alcance).toBeGreaterThan(pesado.alcance);
  });

  it("el golpe crítico alarga el impacto y sacude más la cámara", () => {
    const n = estiloDeAtaque("Térmico", "Fisica");
    const c = estiloDeAtaque("Térmico", "Fisica", { critico: true });
    expect(c.duraciones.impacto).toBeGreaterThan(n.duraciones.impacto);
    expect(c.temblor).toBeGreaterThan(n.temblor);
  });

  it("la secuencia completa dura entre 1,5 y 3 s para todos los animales", () => {
    for (const r of REPTILES_BASE) {
      const e = estiloDeAtaque(r.afinidad, "Tecnica", { pesado: esPesado(r), veloz: esVeloz(r.spd), critico: true });
      const total = duracionTotal(e);
      expect(total).toBeGreaterThan(1500);
      expect(total).toBeLessThan(3000);
    }
  });

  it("hay animales pesados y veloces en el roster, y ninguno es ambas cosas", () => {
    const pesados = REPTILES_BASE.filter((r) => esPesado(r));
    const veloces = REPTILES_BASE.filter((r) => esVeloz(r.spd));
    expect(pesados.length).toBeGreaterThan(3);
    expect(veloces.length).toBeGreaterThan(3);
    expect(pesados.some((p) => veloces.includes(p))).toBe(false);
  });
});
