import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { abilityPatchToRow } from "@/lib/supabase/queries";
import { abilityPatchSchema } from "@/lib/validation/reptile-schema";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = abilityPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("abilities")
    .update(abilityPatchToRow(parsed.data))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Habilidad no encontrada" }, { status: 404 });
  return NextResponse.json({ habilidad: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const supabase = createAdminClient();
  const { error } = await supabase.from("abilities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
