import { describe, it, expect } from "vitest";
import { parseFlag, FEATURES } from "./features";
import { MODOS, modosHabilitados } from "./modos";

describe("parseFlag", () => {
  it("usa el valor por defecto si la variable no está definida o está vacía", () => {
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag(undefined, false)).toBe(false);
    expect(parseFlag("", true)).toBe(true);
    expect(parseFlag("   ", false)).toBe(false);
  });

  it("interpreta valores verdaderos y falsos comunes", () => {
    for (const v of ["1", "true", "TRUE", "on", "si", "sí"]) expect(parseFlag(v, false)).toBe(true);
    for (const v of ["0", "false", "FALSE", "off", "no"]) expect(parseFlag(v, true)).toBe(false);
  });

  it("ignora valores desconocidos y vuelve al defecto", () => {
    expect(parseFlag("quizas", true)).toBe(true);
    expect(parseFlag("quizas", false)).toBe(false);
  });
});

describe("banderas por defecto", () => {
  it("lo nuevo visible está encendido y los modos futuros apagados", () => {
    expect(FEATURES.HIDE_ATTACK_DAMAGE).toBe(true);
    expect(FEATURES.FUTURE_MODES).toBe(false);
  });

  it("los modos futuros no aparecen como habilitados", () => {
    const ids = modosHabilitados().map((m) => m.id);
    expect(ids).not.toContain("todos-contra-todos");
    expect(ids).not.toContain("solo-una-familia");
    expect(ids).toContain("1v1");
    expect(ids).toContain("ia");
    expect(MODOS.length).toBeGreaterThanOrEqual(5);
  });
});
