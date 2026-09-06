import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "admin_session";

function sign(secret: string): string {
  return createHmac("sha256", secret).update("reptiles-rpg-admin").digest("hex");
}

/** Compara la contraseña enviada en el login contra ADMIN_PASSWORD. */
export function isValidAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Valor de cookie a firmar tras un login correcto (no contiene la contraseña en texto plano). */
export function createAdminSessionValue(): string {
  return sign(process.env.ADMIN_PASSWORD ?? "");
}

/** Valida el valor de la cookie de sesión contra la firma esperada. */
export function isValidAdminSession(cookieValue: string | undefined): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !cookieValue) return false;
  const expected = sign(secret);
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Úsalo al inicio de cualquier Route Handler de /api/admin/* que escriba datos. */
export async function requireAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}
