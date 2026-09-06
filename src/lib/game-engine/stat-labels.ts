export type StatKey = "hp" | "atk" | "def" | "spd" | "inst" | "adp";

export interface StatLabel {
  corto: string;
  largo: string;
  emoji: string;
  descripcion: string;
}

/**
 * Única fuente de verdad para cómo se nombra cada estadística en la interfaz.
 * El nombre largo en español es el principal (evita la confusión de ATK/DEF);
 * el código corto queda como referencia secundaria/compacta en tablas y chips.
 */
export const STAT_LABELS: Record<StatKey, StatLabel> = {
  hp: { corto: "HP", largo: "Salud", emoji: "❤️", descripcion: "Resistencia vital y capacidad de aguantar en combate." },
  atk: { corto: "ATK", largo: "Ataque", emoji: "⚔️", descripcion: "Poder ofensivo y capacidad de infligir daño." },
  def: { corto: "DEF", largo: "Defensa", emoji: "🛡️", descripcion: "Resistencia física y capacidad de absorber daño." },
  spd: { corto: "SPD", largo: "Velocidad", emoji: "⚡", descripcion: "Rapidez e iniciativa para actuar primero." },
  inst: { corto: "INST", largo: "Instinto", emoji: "👁️", descripcion: "Percepción, precisión y anticipación." },
  adp: { corto: "ADP", largo: "Adaptación", emoji: "🧬", descripcion: "Versatilidad biológica y flexibilidad táctica." },
};

export const STAT_ORDER: StatKey[] = ["hp", "atk", "def", "spd", "inst", "adp"];
