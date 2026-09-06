import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchReptilesBase, reptileInputToRow } from "@/lib/supabase/queries";
import { reptileInputSchema } from "@/lib/validation/reptile-schema";
import { slugify } from "@/lib/utils";

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const supabase = createAdminClient();
  const reptiles = await fetchReptilesBase(supabase, { incluirInactivos: true });
  return NextResponse.json({ reptiles });
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = reptileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existentes } = await supabase.from("reptiles").select("id, numero");
  const idsExistentes = new Set((existentes ?? []).map((r) => r.id));
  let slug = slugify(parsed.data.nombre);
  let sufijo = 2;
  while (idsExistentes.has(slug)) {
    slug = `${slugify(parsed.data.nombre)}-${sufijo}`;
    sufijo++;
  }
  const siguienteNumero = Math.max(0, ...(existentes ?? []).map((r) => r.numero)) + 1;

  const { data, error } = await supabase
    .from("reptiles")
    .insert({ id: slug, numero: siguienteNumero, activo: true, ...reptileInputToRow(parsed.data) })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reptil: data }, { status: 201 });
}
