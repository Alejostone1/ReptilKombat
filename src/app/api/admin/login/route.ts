import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, createAdminSessionValue, isValidAdminPassword } from "@/lib/auth/admin-session";
import { verificarLimite, obtenerIpCliente } from "@/lib/auth/rate-limit";

const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos

export async function POST(request: Request) {
  const ip = obtenerIpCliente(request);
  const limite = verificarLimite(`admin-login:${ip}`, MAX_INTENTOS, VENTANA_MS);
  if (!limite.permitido) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });

  return NextResponse.json({ ok: true });
}
