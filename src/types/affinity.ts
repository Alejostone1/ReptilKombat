export const AFFINITIES = [
  "Térmico",
  "Acuático",
  "Venenoso",
  "Acorazado",
  "Ágil",
  "Camuflaje",
  "Sensorial",
  "Constrictor",
] as const;

export type Afinidad = (typeof AFFINITIES)[number];

export const AFFINITY_META: Record<
  Afinidad,
  { emoji: string; color: string; description: string }
> = {
  Térmico: {
    emoji: "🔥",
    color: "#E67E22",
    description: "Regulación térmica y ataques basados en calor extremo.",
  },
  Acuático: {
    emoji: "🌊",
    color: "#3498DB",
    description: "Dominio del medio acuático y presión hidrodinámica.",
  },
  Venenoso: {
    emoji: "☠️",
    color: "#8E44AD",
    description: "Toxinas de acción progresiva y desgaste químico.",
  },
  Acorazado: {
    emoji: "🛡️",
    color: "#607D8B",
    description: "Blindaje natural y resistencia estructural extrema.",
  },
  Ágil: {
    emoji: "⚡",
    color: "#2ECC71",
    description: "Velocidad, reflejos e iniciativa en combate.",
  },
  Camuflaje: {
    emoji: "🌿",
    color: "#7D8F2A",
    description: "Mimetismo, sigilo y emboscada.",
  },
  Sensorial: {
    emoji: "👁️",
    color: "#16A085",
    description: "Percepción, precisión y anticipación.",
  },
  Constrictor: {
    emoji: "🐍",
    color: "#795548",
    description: "Control físico, presión y sometimiento.",
  },
};

export type MatchupTier = "ventaja" | "neutral" | "desventaja";

export interface AffinityMatrixCell {
  atacante: Afinidad;
  defensor: Afinidad;
  multiplicador: number;
  tier: MatchupTier;
}

export type AffinityMatrix = Record<Afinidad, Record<Afinidad, number>>;

export interface AffinityAudit {
  afinidad: Afinidad;
  ventajas: Afinidad[];
  debilidades: Afinidad[];
  neutrales: Afinidad[];
  indiceDominancia: number;
  estado: "OK" | "ALERTA";
}
