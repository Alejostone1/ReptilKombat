import type { Afinidad } from "@/types/affinity";
import type { CategoriaHabilidad, Habilidad, TipoEfecto } from "@/types/ability";

/**
 * Descripciones breves y temáticas de los ataques, por tipo de animal y categoría. Cuentan QUÉ hace el
 * movimiento, nunca cuánto daño hace ni contra quién conviene: sin números ni pistas de efectividad.
 */
const FRASES: Record<Afinidad, Record<CategoriaHabilidad, string>> = {
  Térmico: {
    Fisica: "Un golpe cargado con el calor que acumula su cuerpo.",
    Tecnica: "Libera todo su calor en una ráfaga abrasadora.",
    Control: "Una oleada de calor que sofoca los reflejos del rival.",
    Estado: "Absorbe calor del ambiente y se recompone.",
  },
  Acuático: {
    Fisica: "Un embate veloz con la presión de la corriente.",
    Tecnica: "Desata una ola concentrada que arrastra todo a su paso.",
    Control: "Un torrente que desorienta y entorpece al rival.",
    Estado: "Se desliza con la corriente y recupera el aliento.",
  },
  Venenoso: {
    Fisica: "Un mordisco rápido que deja la herida ardiendo.",
    Tecnica: "Inyecta una toxina potente en el momento justo.",
    Control: "Toxinas que minan las fuerzas del rival turno tras turno.",
    Estado: "Un antídoto natural que renueva sus energías.",
  },
  Acorazado: {
    Fisica: "Un golpe pesado respaldado por su blindaje natural.",
    Tecnica: "Embiste con todo el peso de su coraza.",
    Control: "Se planta como una muralla y frena el avance del rival.",
    Estado: "Endurece sus placas y se prepara para resistir.",
  },
  Ágil: {
    Fisica: "Un ataque relámpago imposible de ver venir.",
    Tecnica: "Encadena movimientos veloces en una acometida precisa.",
    Control: "Rodea al rival con piruetas hasta confundirlo.",
    Estado: "Acelera el pulso y gana ritmo de combate.",
  },
  Camuflaje: {
    Fisica: "Emerge del entorno y golpea por sorpresa.",
    Tecnica: "Una emboscada perfecta desde su punto ciego.",
    Control: "Se funde con el terreno y desconcierta al rival.",
    Estado: "Se camufla y aprovecha para recuperarse en calma.",
  },
  Sensorial: {
    Fisica: "Un golpe preciso guiado por sus sentidos.",
    Tecnica: "Detecta el punto exacto y ataca con precisión.",
    Control: "Anticipa cada movimiento y desarma al rival.",
    Estado: "Afina sus sentidos y se concentra.",
  },
  Constrictor: {
    Fisica: "Un latigazo con la fuerza de sus anillos.",
    Tecnica: "Aprieta con una presión devastadora.",
    Control: "Enrosca al rival y le roba la fuerza.",
    Estado: "Se enrolla y recobra el aliento.",
  },
};

/** Qué hace el efecto, dicho sin números. */
const EFECTO: Record<TipoEfecto, string> = {
  veneno: "Puede envenenar al rival.",
  debuff_atk: "Reduce el ataque del rival.",
  debuff_def: "Reduce la defensa del rival.",
  buff_atk: "Aumenta tu ataque.",
  buff_def: "Aumenta tu defensa.",
  buff_spd: "Aumenta tu velocidad.",
  curacion: "Te devuelve parte de tu vida.",
};

const FORCEJEO = "Un forcejeo desesperado cuando ya no te quedan ataques.";

export function descripcionHabilidad(h: Pick<Habilidad, "id" | "afinidad" | "categoria" | "tipoEfecto">): string {
  if (h.id === "forcejeo") return FORCEJEO;
  const base = FRASES[h.afinidad]?.[h.categoria] ?? "Un movimiento característico de este reptil.";
  return h.tipoEfecto ? `${base} ${EFECTO[h.tipoEfecto]}` : base;
}
