"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { useGameStore } from "@/lib/store/game-store";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";

export default function ContraIAPage() {
  const router = useRouter();
  const { roster } = useRoster();
  const iniciarVsIA = useGameStore((s) => s.iniciarVsIA);
  const [nombre, setNombre] = useState("Jugador");
  const [mazo, setMazo] = useState<string[]>([]);

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_CARTAS_MAZO ? prev : [...prev, id]));
  }

  function empezar() {
    const candidatosIA = roster.filter((r) => !mazo.includes(r.id));
    const mazoIA = [...candidatosIA]
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_CARTAS_MAZO)
      .map((r) => r.id);
    iniciarVsIA(mazo, nombre || "Jugador", mazoIA);
    router.push("/jugar/mesa");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">🤖 Contra la IA</h1>
        <p className="text-sm text-foreground-muted">
          Arma tu mazo. La IA arma el suyo y toma decisiones reales: elige el mejor matchup al invocar y el mayor daño esperado al atacar.
        </p>
      </div>

      <Card className="p-4">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="mb-4" />
        <DeckBuilder titulo="Tu mazo" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} accentClass="text-affinity-sensorial" />
      </Card>

      <div className="flex justify-center">
        <Button onClick={empezar} disabled={mazo.length === 0} className="px-8 py-3 text-base">
          🤖 Empezar partida
        </Button>
      </div>
    </div>
  );
}
