import type { Reptil } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { EngineConfig } from "./config";
import { getAffinityMultiplier } from "./affinities";

export interface DamageResult {
  multiplicadorAfinidad: number;
  stab: number;
  danoBase: number;
  danoMinimo: number;
  danoMaximo: number;
  danoEsperado: number;
  porcentajeHP: number;
  golpesParaDerrotar: number;
}

const VARIANZA_MIN = 0.85;
const VARIANZA_MAX = 1.0;

/** Multiplicador de daño según la categoría de la habilidad: Normal=1×, Especial=más, Control=menos (compensa con su efecto). */
function categoriaMultiplicador(categoria: Habilidad["categoria"], config: EngineConfig): number {
  if (categoria === "Tecnica") return config.categoriaEspecialMult;
  if (categoria === "Control") return config.categoriaControlMult;
  return config.categoriaNormalMult;
}

/**
 * Motor de daño único del proyecto. Fórmula:
 * DañoBase = Potencia × ((ATK + offset) / (DEF + offset)) × MultAfinidad × STAB × MultCategoría / divisor
 * DañoEsperado = DañoBase × (Precisión / 100)
 * %HP = (DañoEsperado / HP defensor) × 100
 */
export function calculateDamage(
  atacante: Reptil,
  defensor: Reptil,
  habilidad: Habilidad,
  config: EngineConfig,
): DamageResult {
  const multiplicadorAfinidad = getAffinityMultiplier(atacante.afinidad, defensor.afinidad, config);
  const stab = habilidad.afinidad === atacante.afinidad ? config.stab : 1;
  const multCategoria = categoriaMultiplicador(habilidad.categoria, config);

  const danoBase =
    (habilidad.potencia *
      ((atacante.atk + config.offsetAtkDef) / (defensor.def + config.offsetAtkDef)) *
      multiplicadorAfinidad *
      stab *
      multCategoria) /
    config.divisorDano;

  const danoMinimo = danoBase * VARIANZA_MIN;
  const danoMaximo = danoBase * VARIANZA_MAX;
  const danoEsperado = danoBase * (habilidad.precision / 100);
  const porcentajeHP = defensor.hp > 0 ? (danoEsperado / defensor.hp) * 100 : 0;
  const golpesParaDerrotar = danoEsperado > 0 ? Math.ceil(defensor.hp / danoEsperado) : Infinity;

  return {
    multiplicadorAfinidad,
    stab,
    danoBase: round2(danoBase),
    danoMinimo: round2(danoMinimo),
    danoMaximo: round2(danoMaximo),
    danoEsperado: round2(danoEsperado),
    porcentajeHP: round2(porcentajeHP),
    golpesParaDerrotar,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
