import { describe, it, expect } from "vitest";
import { evaluarDesconexion, salaVencida, segundosRestantesRival, PLAZO_DESCONEXION_MS } from "./conexion";
import { parsearCodigoDesdeQR, normalizarCodigo, urlDeSala } from "@/lib/utils/sala-qr";

const AHORA = Date.parse("2026-01-01T12:00:00Z");
const hace = (s: number) => new Date(AHORA - s * 1000).toISOString();

describe("desconexión de 60 s", () => {
  it("el rival pierde solo al superar el plazo", () => {
    const j = (s: number) => [
      { lado: "A" as const, lastSeen: hace(1) },
      { lado: "B" as const, lastSeen: hace(s) },
    ];
    expect(evaluarDesconexion(j(30), "A", AHORA).abandona).toBeNull();
    expect(evaluarDesconexion(j(60), "A", AHORA).abandona).toBeNull(); // justo en el plazo: aún no
    expect(evaluarDesconexion(j(61), "A", AHORA).abandona).toBe("B");
    expect(evaluarDesconexion(j(61), "A", AHORA).segundosSinSenalRival).toBe(61);
  });

  it("nunca penaliza a quien evalúa y tolera datos inválidos", () => {
    const j = [
      { lado: "A" as const, lastSeen: hace(500) },
      { lado: "B" as const, lastSeen: hace(1) },
    ];
    expect(evaluarDesconexion(j, "A", AHORA).abandona).toBeNull(); // yo (A) estuve callado, pero evalúo al rival B
    expect(evaluarDesconexion([{ lado: "A", lastSeen: hace(1) }], "A", AHORA).abandona).toBeNull(); // sin rival
    expect(evaluarDesconexion([{ lado: "A", lastSeen: "x" }, { lado: "B", lastSeen: "basura" }], "A", AHORA).abandona).toBeNull();
  });

  it("cuenta atrás y vigencia de sala", () => {
    expect(segundosRestantesRival(45)).toBe(15);
    expect(segundosRestantesRival(200)).toBe(0);
    expect(PLAZO_DESCONEXION_MS).toBe(60_000);
    expect(salaVencida(null, AHORA)).toBe(false);
    expect(salaVencida(hace(10), AHORA)).toBe(true);
    expect(salaVencida(new Date(AHORA + 1000).toISOString(), AHORA)).toBe(false);
  });
});

describe("código desde QR", () => {
  const origin = "https://reptilkombat.vercel.app";

  it("acepta enlaces del mismo origen y códigos sueltos", () => {
    expect(parsearCodigoDesdeQR(urlDeSala(origin, "ABC234"), origin)).toBe("ABC234");
    expect(parsearCodigoDesdeQR(`${origin}/jugar/sala/abc234`, origin)).toBe("ABC234");
    expect(parsearCodigoDesdeQR(" abc234 ", origin)).toBe("ABC234");
  });

  it("rechaza otros orígenes, rutas, caracteres inválidos y basura", () => {
    expect(parsearCodigoDesdeQR("https://malo.com/sala/ABC234", origin)).toBeNull();
    expect(parsearCodigoDesdeQR(`${origin}/otra/ABC234`, origin)).toBeNull();
    expect(parsearCodigoDesdeQR(`${origin}/sala/ABC23`, origin)).toBeNull(); // 5 caracteres
    expect(parsearCodigoDesdeQR(`${origin}/sala/ABCO23`, origin)).toBeNull(); // 'O' no existe en el alfabeto
    expect(parsearCodigoDesdeQR("hola mundo", origin)).toBeNull();
    expect(parsearCodigoDesdeQR("", origin)).toBeNull();
    expect(normalizarCodigo("ab1234")).toBeNull(); // '1' no existe
  });
});

describe("desconexión en 2 vs 2", () => {
  const j = (lado: "A" | "B", asiento: number, s: number) => ({ lado, asiento, lastSeen: hace(s) });
  it("el equipo de quien se calla pierde; si callan de ambos equipos no se decide", async () => {
    const { evaluarDesconexionEquipos } = await import("./conexion");
    const yo = { lado: "A" as const, asiento: 1 };
    expect(evaluarDesconexionEquipos([j("A", 1, 1), j("B", 1, 5), j("A", 2, 5), j("B", 2, 5)], yo, AHORA).equipoAbandona).toBeNull();
    expect(evaluarDesconexionEquipos([j("A", 1, 1), j("B", 1, 90), j("A", 2, 5), j("B", 2, 5)], yo, AHORA).equipoAbandona).toBe("B");
    expect(evaluarDesconexionEquipos([j("A", 1, 1), j("B", 1, 5), j("A", 2, 90), j("B", 2, 5)], yo, AHORA).equipoAbandona).toBe("A"); // mi compañero
    expect(evaluarDesconexionEquipos([j("A", 1, 1), j("B", 1, 90), j("A", 2, 90), j("B", 2, 5)], yo, AHORA).equipoAbandona).toBeNull();
    expect(evaluarDesconexionEquipos([j("A", 1, 500), j("B", 1, 5), j("A", 2, 5), j("B", 2, 5)], yo, AHORA).equipoAbandona).toBeNull(); // yo no cuento
  });
});
