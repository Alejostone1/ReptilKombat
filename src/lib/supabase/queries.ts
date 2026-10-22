import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReptileRow, AbilityRow, EngineConfigRow } from "./types";
import type { ReptilBase } from "@/types/reptile";
import type { Habilidad } from "@/types/ability";
import type { Afinidad } from "@/types/affinity";
import type { CategoriaHabilidad, TipoEfecto } from "@/types/ability";
import type { EngineConfig } from "@/lib/game-engine/config";
import { DEFAULT_ENGINE_CONFIG } from "@/lib/game-engine/config";

type Client = SupabaseClient<Database>;

function rowToReptilBase(row: ReptileRow): ReptilBase {
  return {
    id: row.id,
    numero: row.numero,
    nombre: row.nombre,
    nombreCientifico: row.nombre_cientifico,
    familia: row.familia,
    genero: row.genero ?? undefined,
    afinidad: row.afinidad as Afinidad,
    rolTactico: row.rol_tactico,
    habitat: row.habitat,
    distribucion: row.distribucion,
    descripcion: row.descripcion,
    imagenUrl: row.imagen_url ?? undefined,
    imagenFuente: row.imagen_fuente ?? undefined,
    imagenAutor: row.imagen_autor ?? undefined,
    hp: row.hp,
    atk: row.atk,
    def: row.def,
    spd: row.spd,
    inst: row.inst,
    adp: row.adp,
    energiaMax: row.energia_max,
    criticoProbabilidad: row.critico_probabilidad,
    family: row.family ?? "reptil",
    pasiva: row.pasiva ?? undefined,
    activo: row.activo,
    fechaCreacion: row.fecha_creacion,
  };
}

/** camelCase -> snake_case para crear un reptil nuevo (usado solo por /api/admin). */
export function reptileInputToRow(input: {
  nombre: string;
  nombreCientifico: string;
  familia: string;
  genero?: string;
  afinidad: string;
  rolTactico: string;
  habitat: string;
  distribucion: string;
  descripcion: string;
  pasiva?: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  inst: number;
  adp: number;
  energiaMax: number;
  criticoProbabilidad: number;
}): Omit<ReptileRow, "activo" | "fecha_creacion" | "id" | "numero" | "imagen_url" | "imagen_fuente" | "imagen_autor" | "family"> {
  return {
    nombre: input.nombre,
    nombre_cientifico: input.nombreCientifico,
    familia: input.familia,
    genero: input.genero ?? null,
    afinidad: input.afinidad,
    rol_tactico: input.rolTactico,
    habitat: input.habitat,
    distribucion: input.distribucion,
    descripcion: input.descripcion,
    pasiva: input.pasiva ?? null,
    hp: input.hp,
    atk: input.atk,
    def: input.def,
    spd: input.spd,
    inst: input.inst,
    adp: input.adp,
    energia_max: input.energiaMax,
    critico_probabilidad: input.criticoProbabilidad,
  };
}

/** camelCase -> snake_case parcial, para PATCH /api/admin/reptiles/[id]. */
export function reptilePatchToRow(patch: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    nombreCientifico: "nombre_cientifico",
    rolTactico: "rol_tactico",
    energiaMax: "energia_max",
    criticoProbabilidad: "critico_probabilidad",
    imagenUrl: "imagen_url",
  };
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    row[map[key] ?? key] = value;
  }
  return row;
}

function rowToHabilidad(row: AbilityRow): Habilidad {
  return {
    id: row.id,
    nombre: row.nombre,
    propietarioId: row.propietario_id,
    afinidad: row.afinidad as Afinidad,
    potencia: row.potencia,
    precision: row.precision,
    categoria: row.categoria as CategoriaHabilidad,
    efecto: row.efecto,
    cooldown: row.cooldown ?? undefined,
    prioridad: row.prioridad ?? undefined,
    descripcion: row.descripcion ?? undefined,
    costoEnergia: row.costo_energia,
    cooldownTurnos: row.cooldown_turnos,
    tipoEfecto: (row.tipo_efecto as TipoEfecto | null) ?? null,
    efectoMagnitud: row.efecto_magnitud ?? null,
    efectoTurnos: row.efecto_turnos ?? null,
  };
}

/** Reptiles activos (roster público). Pasa `{ incluirInactivos: true }` desde /admin. */
export async function fetchReptilesBase(
  supabase: Client,
  opts: { incluirInactivos?: boolean } = {},
): Promise<ReptilBase[]> {
  let query = supabase.from("reptiles").select("*").order("numero", { ascending: true });
  if (!opts.incluirInactivos) query = query.eq("activo", true);
  const { data, error } = await query;
  if (error) throw new Error(`fetchReptilesBase: ${error.message}`);
  return (data ?? []).map(rowToReptilBase);
}

/** camelCase -> snake_case para crear una habilidad nueva (usado solo por /api/admin). */
export function abilityInputToRow(input: {
  nombre: string;
  propietarioId: string;
  afinidad: string;
  potencia: number;
  precision: number;
  categoria: string;
  efecto: string;
  cooldown?: number;
  prioridad?: number;
  descripcion?: string;
  costoEnergia?: number;
  cooldownTurnos?: number;
  tipoEfecto?: string | null;
  efectoMagnitud?: number | null;
  efectoTurnos?: number | null;
}): Omit<AbilityRow, "id"> {
  return {
    nombre: input.nombre,
    propietario_id: input.propietarioId,
    afinidad: input.afinidad,
    potencia: input.potencia,
    precision: input.precision,
    categoria: input.categoria,
    efecto: input.efecto,
    cooldown: input.cooldown ?? null,
    prioridad: input.prioridad ?? null,
    descripcion: input.descripcion ?? null,
    costo_energia: input.costoEnergia ?? 0,
    cooldown_turnos: input.cooldownTurnos ?? 0,
    tipo_efecto: (input.tipoEfecto as AbilityRow["tipo_efecto"]) ?? null,
    efecto_magnitud: input.efectoMagnitud ?? null,
    efecto_turnos: input.efectoTurnos ?? null,
  };
}

/** camelCase -> snake_case parcial, para PATCH /api/admin/habilidades/[id]. */
export function abilityPatchToRow(patch: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    propietarioId: "propietario_id",
    costoEnergia: "costo_energia",
    cooldownTurnos: "cooldown_turnos",
    tipoEfecto: "tipo_efecto",
    efectoMagnitud: "efecto_magnitud",
    efectoTurnos: "efecto_turnos",
  };
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    row[map[key] ?? key] = value;
  }
  return row;
}

export async function fetchAbilities(supabase: Client): Promise<Habilidad[]> {
  const { data, error } = await supabase.from("abilities").select("*");
  if (error) throw new Error(`fetchAbilities: ${error.message}`);
  return (data ?? []).map(rowToHabilidad);
}

export async function fetchEngineConfig(supabase: Client): Promise<EngineConfig> {
  const { data, error } = await supabase.from("engine_config").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_ENGINE_CONFIG;
  const row = data as unknown as EngineConfigRow;
  return {
    ventaja: row.ventaja,
    neutral: row.neutral,
    desventaja: row.desventaja,
    stab: row.stab,
    bstEstandar: row.bst_estandar,
    winRateDominante: row.win_rate_dominante,
    winRateDebil: row.win_rate_debil,
    offsetAtkDef: row.offset_atk_def,
    divisorDano: row.divisor_dano,
    categoriaNormalMult: row.categoria_normal_mult,
    categoriaEspecialMult: row.categoria_especial_mult,
    categoriaControlMult: row.categoria_control_mult,
    criticoMultiplicador: row.critico_multiplicador,
    energiaRegenTurno: row.energia_regen_turno,
  };
}
