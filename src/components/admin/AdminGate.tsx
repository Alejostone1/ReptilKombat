"use client";

import { useState, type ReactNode } from "react";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Envuelve cualquier página bajo /admin: pide contraseña si no hay sesión, renderiza el contenido si la hay. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { status, error, login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center text-foreground-muted">Verificando sesión...</div>;
  }

  if (status === "out") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-sm p-6">
          <CardHeader>
            <CardTitle>🔒 Acceso administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                await login(password);
                setSubmitting(false);
              }}
            >
              <Input
                type="password"
                autoFocus
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-xs text-state-danger">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
