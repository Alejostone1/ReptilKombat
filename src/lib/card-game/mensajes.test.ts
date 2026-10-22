import { describe, it, expect } from "vitest";
import { mensajeDeAtaque, impactoFlotante } from "./mensajes";

const base = { dano: 20, tier: "neutral" as const, critico: false, derrotado: false, efecto: null };

describe("mensajes de ataque", () => {
  it("prioriza K.O. > crítico > efectividad", () => {
    expect(mensajeDeAtaque({ ...base, derrotado: true, critico: true }).titulo).toBe("¡K.O.!");
    expect(mensajeDeAtaque({ ...base, critico: true, tier: "ventaja" }).titulo).toBe("¡Golpe crítico!");
    expect(mensajeDeAtaque({ ...base, tier: "ventaja" }).titulo).toBe("¡Súper efectivo!");
    expect(mensajeDeAtaque({ ...base, tier: "desventaja" }).titulo).toBe("No es muy efectivo…");
    expect(mensajeDeAtaque(base).titulo).toBe("¡Impacto!");
  });

  it("daño 0 sin efecto = 'No hizo nada'; con efecto = 'Efecto aplicado'", () => {
    expect(mensajeDeAtaque({ ...base, dano: 0 }).titulo).toBe("No hizo nada…");
    const m = mensajeDeAtaque({ ...base, dano: 0, efecto: { tipo: "veneno", magnitud: 5 } });
    expect(m.titulo).toBe("¡Efecto aplicado!");
    expect(m.detalle).toMatch(/envenen/);
  });

  it("el número flota sobre el rival; curación y mejoras sobre el atacante", () => {
    expect(impactoFlotante(base)).toEqual({ texto: "-20", tono: "dano", sobre: "rival" });
    expect(impactoFlotante({ ...base, critico: true }).tono).toBe("critico");
    expect(impactoFlotante({ ...base, dano: 0, efecto: { tipo: "curacion", magnitud: 20 } }).sobre).toBe("atacante");
    expect(impactoFlotante({ ...base, dano: 0, efecto: { tipo: "debuff_def", magnitud: 20 } }).sobre).toBe("rival");
  });
});
