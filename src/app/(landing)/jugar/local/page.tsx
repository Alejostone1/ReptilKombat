"use client";

import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { useEngineData } from "@/lib/hooks/useEngineData";
import { useGameStore } from "@/lib/store/game-store";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function JugarLocalPage() {
  const router = useRouter();
  const { roster, abilities } = useRoster();
  const { config } = useEngineData();
  const { mazoA, mazoB, nombreA, nombreB, setNombreA, setNombreB, toggleCarta, puedeIniciar, iniciar } = useGameStore();

  function empezar() {
    iniciar(nombreA || "Jugador A", nombreB || "Jugador B", roster, abilities, config);
    router.push("/jugar/mesa");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🎮 Este dispositivo</h1>
        <p className="text-sm text-foreground-muted">
          Arma tu mazo de hasta {MAX_CARTAS_MAZO} reptiles y juega una partida por turnos, cara a cara en el mismo dispositivo. El
          daño se calcula con el mismo motor que el simulador — sin sorpresas, todo verificable.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <Input value={nombreA} onChange={(e) => setNombreA(e.target.value)} placeholder="Nombre del jugador A" />
          <DeckBuilder
            titulo="Mazo — Jugador A"
            roster={roster}
            seleccionados={mazoA}
            bloqueados={mazoB}
            onToggle={(id) => toggleCarta("A", id)}
            accentClass="text-affinity-agil"
          />
        </Card>
        <Card className="space-y-3 p-4">
          <Input value={nombreB} onChange={(e) => setNombreB(e.target.value)} placeholder="Nombre del jugador B" />
          <DeckBuilder
            titulo="Mazo — Jugador B"
            roster={roster}
            seleccionados={mazoB}
            bloqueados={mazoA}
            onToggle={(id) => toggleCarta("B", id)}
            accentClass="text-affinity-termico"
          />
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={empezar} disabled={!puedeIniciar()} className="px-8 py-3 text-base">
          🎴 Empezar partida
        </Button>
      </div>
    </div>
  );
}
