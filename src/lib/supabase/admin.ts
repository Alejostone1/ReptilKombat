import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave secreta (service_role): bypassa RLS por completo.
 * SOLO se importa desde Route Handlers de /api/admin/*. Nunca desde código
 * que se ejecute en el navegador — "server-only" rompe el build si eso pasa.
 *
 * Sin el genérico <Database>: el tipo hecho a mano no modela perfectamente
 * los overloads de update/insert/select de supabase-js (infiere `never` en
 * cadenas como .update().eq().select()), y estas rutas ya validan y dan
 * forma a cada fila con los mappers de lib/supabase/queries.ts.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY en .env.local (Project Settings -> API Keys -> secret key).",
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
