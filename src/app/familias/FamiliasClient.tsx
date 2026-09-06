"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROSTER } from "@/data/roster";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function FamiliasClient({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof ROSTER>();
    for (const r of ROSTER) {
      if (!map.has(r.familia)) map.set(r.familia, []);
      map.get(r.familia)!.push(r);
    }
    return Array.from(map.entries())
      .map(([familia, miembros]) => {
        const afinidades = Array.from(new Set(miembros.map((m) => m.afinidad)));
        const roles = Array.from(new Set(miembros.map((m) => m.rolTactico)));
        const avg = (key: "hp" | "atk" | "def" | "spd" | "inst" | "adp") =>
          Math.round((miembros.reduce((acc, m) => acc + m[key], 0) / miembros.length) * 10) / 10;
        return {
          familia,
          miembros,
          afinidades,
          roles,
          promedio: { hp: avg("hp"), atk: avg("atk"), def: avg("def"), spd: avg("spd"), inst: avg("inst"), adp: avg("adp") },
        };
      })
      .sort((a, b) => b.miembros.length - a.miembros.length || a.familia.localeCompare(b.familia));
  }, []);

  const filtrados = grupos.filter((g) => !query || g.familia.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🧬 Familias Biológicas</h1>
        <p className="text-sm text-foreground-muted">{grupos.length} familias representadas en el roster actual.</p>
      </div>

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar familia..." className="max-w-xs" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((g) => (
          <Card key={g.familia}>
            <CardHeader>
              <CardTitle>{g.familia}</CardTitle>
              <span className="text-xs text-foreground-muted">{g.miembros.length} personajes</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {g.afinidades.map((a) => (
                  <AffinityBadge key={a} afinidad={a} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                {Object.entries(g.promedio).map(([k, v]) => (
                  <div key={k} className="rounded bg-panel-secondary py-1">
                    <p className="uppercase text-foreground-muted">{k}</p>
                    <p className="font-mono text-foreground">{v}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-foreground-muted">Roles: {g.roles.join(", ")}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.miembros.map((m) => (
                  <Link
                    key={m.id}
                    href={`/reptiles/${m.id}`}
                    className="rounded-full bg-panel-secondary px-2 py-0.5 text-xs text-foreground-muted hover:text-reptile-green"
                  >
                    {m.nombre}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
