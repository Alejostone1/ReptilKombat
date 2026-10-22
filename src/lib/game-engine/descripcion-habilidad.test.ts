import { describe, it, expect } from "vitest";
import { ABILITIES } from "@/data/abilities";
import { descripcionHabilidad } from "./descripcion-habilidad";

describe("descripciones de ataques", () => {
  it("todas las habilidades tienen una descripción corta y sin números ni pistas de efectividad", () => {
    for (const h of ABILITIES) {
      const d = descripcionHabilidad(h);
      expect(d.length).toBeGreaterThan(15);
      expect(d.length).toBeLessThan(120);
      expect(d).not.toMatch(/\d/); // sin potencia, daño ni porcentajes
      expect(d.toLowerCase()).not.toMatch(/débil|fuerte|ventaja|desventaja|efectiv|daño|%/);
    }
  });

  it("los ataques con efecto lo cuentan en palabras", () => {
    const control = ABILITIES.find((a) => a.tipoEfecto === "veneno");
    expect(control && descripcionHabilidad(control)).toMatch(/envenenar/);
    const cura = ABILITIES.find((a) => a.tipoEfecto === "curacion");
    expect(cura && descripcionHabilidad(cura)).toMatch(/vida/);
  });

  it("el Forcejeo tiene su propia descripción", () => {
    expect(descripcionHabilidad({ id: "forcejeo", afinidad: "Térmico", categoria: "Fisica", tipoEfecto: null })).toMatch(/forcejeo/i);
  });
});
