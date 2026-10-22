import type { CategoriaHabilidad } from "@/types/ability";

/**
 * Cómo se presenta cada categoría de ataque al jugador. Solo icono y nombre: nunca potencia ni
 * precisión (el daño no se revela antes de atacar).
 */
export const CATEGORIA_INFO: Record<CategoriaHabilidad, { icono: string; nombre: string }> = {
  Fisica: { icono: "👊", nombre: "Normal" },
  Tecnica: { icono: "✨", nombre: "Especial" },
  Control: { icono: "🌀", nombre: "Control" },
  Estado: { icono: "💚", nombre: "Apoyo" },
};
