import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { reptilePatchToRow } from "@/lib/supabase/queries";
import { reptilePatchSchema } from "@/lib/validation/reptile-schema";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = reptilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reptiles")
    .update(reptilePatchToRow(parsed.data))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Reptil no encontrado" }, { status: 404 });
  return NextResponse.json({ reptil: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const supabase = createAdminClient();
  // Las habilidades del reptil se eliminan en cascada (FK ON DELETE CASCADE en supabase/migrations/0001_init.sql).
  const { error } = await supabase.from("reptiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
