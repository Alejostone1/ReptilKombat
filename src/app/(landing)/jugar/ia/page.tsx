"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import type { PersonalidadIA } from "@/lib/card-game/ai";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { cn } from "@/lib/utils";

const PERSONALIDADES: { id: PersonalidadIA; emoji: string; nombre: string; descripcion: string }[] = [
  { id: "equilibrada", emoji: "⚖️", nombre: "Equilibrada", descripcion: "Prioriza el mayor daño esperado, se cura a HP bajo." },
  { id: "agresiva", emoji: "🔥", nombre: "Agresiva", descripcion: "Ataca sin parar, casi nunca se defiende." },
  { id: "defensiva", emoji: "🛡️", nombre: "Defensiva", descripcion: "Se cura o potencia apenas su HP baja de la mitad." },
  { id: "estrategica", emoji: "🧠", nombre: "Estratégica", descripcion: "Explota ventajas de afinidad y debilita al rival antes de rematar." },
];

export default function ContraIAPage() {
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const iniciarVsIA = useGameStore((s) => s.iniciarVsIA);
  const [nombre, setNombre] = useState("Jugador");
  const [mazo, setMazo] = useState<string[]>([]);
  const [personalidad, setPersonalidad] = useState<PersonalidadIA>("equilibrada");

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_CARTAS_MAZO ? prev : [...prev, id]));
  }

  function empezar() {
    const candidatosIA = roster.filter((r) => !mazo.includes(r.id));
    const mazoIA = [...candidatosIA]
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_CARTAS_MAZO)
      .map((r) => r.id);
    iniciarVsIA(mazo, nombre || "Jugador", mazoIA, roster, abilities, config, personalidad);
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

      <Card className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Personalidad de la IA</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PERSONALIDADES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonalidad(p.id)}
              title={p.descripcion}
              className={cn(
                "rounded-lg border px-3 py-2 text-center text-xs transition-colors",
                personalidad === p.id ? "border-reptile-green/60 bg-reptile-green/10 text-foreground" : "border-border-subtle text-foreground-muted hover:border-reptile-green/40",
              )}
            >
              <span className="block text-lg">{p.emoji}</span>
              <span className="font-semibold">{p.nombre}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-foreground-muted">{PERSONALIDADES.find((p) => p.id === personalidad)?.descripcion}</p>
      </Card>

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
