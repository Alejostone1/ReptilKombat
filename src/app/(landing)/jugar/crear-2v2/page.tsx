"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { MAX_CARTAS_MAZO_2V2 } from "@/lib/card-game/engine-equipos";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obtenerSessionId, guardarViewToken } from "@/lib/utils/session";
import { FEATURES } from "@/config/features";

export default function CrearPartida2v2Page() {
  const router = useRouter();
  const { roster } = useRoster();
  const [nombre, setNombre] = useState("Jugador 1");
  const [mazo, setMazo] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_CARTAS_MAZO_2V2 ? prev : [...prev, id]));
  }

  async function crear() {
    setCreando(true);
    setError(null);
    const res = await fetch("/api/game/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: obtenerSessionId(), nombre, mazo, formato: "2v2" }),
    });
    const json = await res.json();
    setCreando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la sala.");
      return;
    }
    guardarViewToken(json.codigo, json.viewToken);
    router.push(`/jugar/sala/${json.codigo}`);
  }

  if (!FEATURES.MODE_2V2) {
    return <p className="p-8 text-center text-foreground-muted">El modo 2 vs 2 no está disponible por ahora.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 py-4 sm:px-4 sm:py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">👥 Crear partida 2 vs 2</h1>
        <p className="text-sm text-foreground-muted">
          Elige tus {MAX_CARTAS_MAZO_2V2} cartas y comparte el código o el QR. Cuando entren 4 jugadores, ¡empieza sola!
        </p>
      </div>

      <Card className="p-4">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="mb-4" />
        <DeckBuilder titulo="Tu mazo (2 cartas)" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} maxCartas={MAX_CARTAS_MAZO_2V2} />
      </Card>

      {error && <p className="text-center text-sm text-state-danger">{error}</p>}

      <div className="flex justify-center">
        <Button onClick={crear} disabled={mazo.length === 0 || creando} className="px-8 py-3 text-base">
          {creando ? "Creando..." : "🎴 Crear sala 2 vs 2"}
        </Button>
      </div>
    </div>
  );
}
