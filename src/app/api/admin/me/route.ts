import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/auth/admin-session";

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = isValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  return NextResponse.json({ authenticated });
}
