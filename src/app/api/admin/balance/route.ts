import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { createAdminClient } from "@/lib/supabase/admin";

interface StatsPorReptil {
  reptilId: string;
  partidas: number;
  victorias: number;
}

/**
 * Balance real a partir de partidas online efectivamente jugadas (tabla match_results, poblada
 * por /api/game/rooms/[codigo]/action al terminar una partida). Nunca datos simulados: si no hay
 * partidas todavía, la lista vuelve vacía y el panel debe mostrar un estado explícito de "sin datos".
 */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("match_results")
    .select("ganador_lado, reptiles_a, reptiles_b")
    .order("creado_en", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const porReptil = new Map<string, StatsPorReptil>();
  function sumar(reptilId: string, gano: boolean) {
    const actual = porReptil.get(reptilId) ?? { reptilId, partidas: 0, victorias: 0 };
    actual.partidas++;
    if (gano) actual.victorias++;
    porReptil.set(reptilId, actual);
  }

  for (const fila of data ?? []) {
    const ganoA = fila.ganador_lado === "A";
    for (const id of (fila.reptiles_a as string[]) ?? []) sumar(id, ganoA);
    for (const id of (fila.reptiles_b as string[]) ?? []) sumar(id, !ganoA);
  }

  const stats = Array.from(porReptil.values())
    .map((s) => ({ ...s, winRate: s.partidas > 0 ? Math.round((s.victorias / s.partidas) * 1000) / 10 : 0 }))
    .sort((a, b) => b.partidas - a.partidas);

  return NextResponse.json({ totalPartidas: data?.length ?? 0, stats });
}
