"use client";

import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAdminAuth } from "@/lib/hooks/useAdminAuth";
import { Button } from "@/components/ui/Button";

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminHome />
    </AdminGate>
  );
}

function AdminHome() {
  const { logout } = useAdminAuth();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🔒 Panel de administración</h1>
          <p className="text-sm text-foreground-muted">Editar, desactivar o eliminar reptiles y habilidades.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/reptiles">
          <Card className="p-6 transition-colors hover:border-reptile-green/50">
            <CardHeader>
              <CardTitle>🦎 Reptiles</CardTitle>
            </CardHeader>
            <CardContent>Crear, editar estadísticas, desactivar o eliminar reptiles del roster.</CardContent>
          </Card>
        </Link>
        <Link href="/admin/habilidades">
          <Card className="p-6 transition-colors hover:border-reptile-green/50">
            <CardHeader>
              <CardTitle>⚔️ Habilidades</CardTitle>
            </CardHeader>
            <CardContent>Editar potencia, precisión, energía, cooldown y efectos de las 160 habilidades.</CardContent>
          </Card>
        </Link>
        <Link href="/admin/balance">
          <Card className="p-6 transition-colors hover:border-reptile-green/50">
            <CardHeader>
              <CardTitle>📊 Balance</CardTitle>
            </CardHeader>
            <CardContent>Win rate y partidas jugadas por reptil, con datos reales de partidas online.</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
