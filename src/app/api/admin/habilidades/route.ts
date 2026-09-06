import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAbilities, abilityInputToRow } from "@/lib/supabase/queries";
import { abilityInputSchema } from "@/lib/validation/reptile-schema";
import { slugify } from "@/lib/utils";

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const supabase = createAdminClient();
  const abilities = await fetchAbilities(supabase);
  return NextResponse.json({ abilities });
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = abilityInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existentes } = await supabase.from("abilities").select("id");
  const idsExistentes = new Set((existentes ?? []).map((a) => a.id));
  let slug = slugify(`${parsed.data.propietarioId}-${parsed.data.nombre}`);
  let sufijo = 2;
  while (idsExistentes.has(slug)) {
    slug = `${slugify(`${parsed.data.propietarioId}-${parsed.data.nombre}`)}-${sufijo}`;
    sufijo++;
  }

  const { data, error } = await supabase
    .from("abilities")
    .insert({ id: slug, ...abilityInputToRow(parsed.data) })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habilidad: data }, { status: 201 });
}
