import { z } from "zod";
import { AFFINITIES } from "@/types/affinity";

/** Único schema de un reptil, compartido entre /nuevo-personaje (cliente) y /api/admin/reptiles (servidor). */
export const reptileInputSchema = z.object({
  nombre: z.string().min(2, "Requerido"),
  nombreCientifico: z.string().min(2, "Requerido"),
  familia: z.string().min(2, "Requerido"),
  genero: z.string().optional(),
  afinidad: z.enum(AFFINITIES),
  rolTactico: z.string().min(2, "Requerido"),
  habitat: z.string().min(2, "Requerido"),
  distribucion: z.string().min(2, "Requerido"),
  descripcion: z.string().min(10, "Describe al menos en una frase"),
  pasiva: z.string().optional(),
  hp: z.coerce.number().min(1).max(150),
  atk: z.coerce.number().min(1).max(150),
  def: z.coerce.number().min(1).max(150),
  spd: z.coerce.number().min(1).max(150),
  inst: z.coerce.number().min(1).max(150),
  adp: z.coerce.number().min(1).max(150),
});

export type ReptileInput = z.infer<typeof reptileInputSchema>;

export const reptilePatchSchema = reptileInputSchema.partial().extend({
  activo: z.boolean().optional(),
});

export type ReptilePatch = z.infer<typeof reptilePatchSchema>;

export const abilityInputSchema = z.object({
  nombre: z.string().min(2, "Requerido"),
  propietarioId: z.string().min(1, "Requerido"),
  afinidad: z.enum(AFFINITIES),
  potencia: z.coerce.number().min(0).max(200),
  precision: z.coerce.number().min(1).max(100),
  categoria: z.enum(["Fisica", "Tecnica", "Control", "Estado"]),
  efecto: z.string().min(2, "Requerido"),
  cooldown: z.coerce.number().optional(),
  prioridad: z.coerce.number().optional(),
  descripcion: z.string().optional(),
});

export type AbilityInput = z.infer<typeof abilityInputSchema>;

export const abilityPatchSchema = abilityInputSchema.partial();

export type AbilityPatch = z.infer<typeof abilityPatchSchema>;
