"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/admin/AdminGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useRoster } from "@/lib/hooks/useRoster";

interface StatsPorReptil {
  reptilId: string;
  partidas: number;
  victorias: number;
  winRate: number;
}

export default function AdminBalancePage() {
  return (
    <AdminGate>
      <BalanceAdmin />
    </AdminGate>
  );
}

function BalanceAdmin() {
  const { getReptilById } = useRoster();
  const [stats, setStats] = useState<StatsPorReptil[] | null>(null);
  const [totalPartidas, setTotalPartidas] = useState(0);

  useEffect(() => {
    async function cargar() {
      const res = await fetch("/api/admin/balance");
      const json = await res.json();
      setStats(json.stats ?? []);
      setTotalPartidas(json.totalPartidas ?? 0);
    }
    cargar();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-foreground-muted hover:text-reptile-green">
          ← Panel admin
        </Link>
        <h1 className="text-2xl font-bold text-foreground">📊 Balance</h1>
        <p className="text-sm text-foreground-muted">
          Win rate y partidas jugadas por reptil, calculado a partir de partidas online realmente terminadas — nunca datos simulados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{totalPartidas} partidas online registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {stats === null ? (
            <p className="text-sm text-foreground-muted">Cargando...</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Aún no hay suficientes datos. Esta tabla se completa a medida que se jueguen partidas online (crear con amigo, unirse o
              partida aleatoria) hasta el final.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-foreground-muted">
                  <tr>
                    <th className="px-2 py-2 text-left">Reptil</th>
                    <th className="px-2 py-2 text-right">Partidas</th>
                    <th className="px-2 py-2 text-right">Victorias</th>
                    <th className="px-2 py-2 text-right">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => {
                    const reptil = getReptilById(s.reptilId);
                    const dominante = s.winRate >= 55 && s.partidas >= 5;
                    const debil = s.winRate <= 45 && s.partidas >= 5;
                    return (
                      <tr key={s.reptilId} className="border-t border-border-subtle">
                        <td className="px-2 py-1.5 font-medium text-foreground">{reptil?.nombre ?? s.reptilId}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{s.partidas}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{s.victorias}</td>
                        <td className="px-2 py-1.5 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono">{s.winRate}%</span>
                            {dominante && <Badge tone="danger">🔴 Dominante</Badge>}
                            {debil && <Badge tone="warn">🟡 Débil</Badge>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
