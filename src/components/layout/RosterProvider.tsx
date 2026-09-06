"use client";

import type { ReactNode } from "react";
import { useRosterStore } from "@/lib/store/roster-store";
import { useRoster } from "@/lib/hooks/useRoster";

/**
 * Dispara la carga del roster desde Supabase una sola vez y bloquea el
 * contenido con una pantalla de carga/­error mientras tanto, para que
 * ninguna página tenga que preocuparse por el estado inicial vacío.
 */
export function RosterProvider({ children }: { children: ReactNode }) {
  const { loading, error } = useRoster();
  const status = useRosterStore((s) => s.status);

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-4xl">🦎</span>
        <p className="text-lg font-semibold text-foreground">No se pudo cargar el roster</p>
        <p className="max-w-sm text-sm text-foreground-muted">{error}</p>
        <p className="text-xs text-foreground-muted">
          Verifica NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local y que las tablas
          existan (supabase/migrations).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="animate-pulse text-4xl">🦎</span>
        <p className="text-sm text-foreground-muted">Cargando roster...</p>
      </div>
    );
  }

  return <>{children}</>;
}
