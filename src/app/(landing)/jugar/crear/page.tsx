"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obtenerSessionId, guardarViewToken } from "@/lib/utils/session";

export default function CrearPartidaPage() {
  const router = useRouter();
  const { roster } = useRoster();
  const [nombre, setNombre] = useState("Jugador 1");
  const [mazo, setMazo] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]));
  }

  async function crear() {
    setCreando(true);
    setError(null);
    const res = await fetch("/api/game/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: obtenerSessionId(), nombre, mazo }),
    });
    const json = await res.json();
    setCreando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo crear la partida.");
      return;
    }
    guardarViewToken(json.codigo, json.viewToken);
    router.push(`/jugar/sala/${json.codigo}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">⚔️ Crear partida</h1>
        <p className="text-sm text-foreground-muted">Arma tu mazo y comparte el código con tu oponente.</p>
      </div>

      <Card className="p-4">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="mb-4" />
        <DeckBuilder titulo="Tu mazo" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} />
      </Card>

      {error && <p className="text-center text-sm text-state-danger">{error}</p>}

      <div className="flex justify-center">
        <Button onClick={crear} disabled={mazo.length === 0 || creando} className="px-8 py-3 text-base">
          {creando ? "Creando..." : "🎴 Crear sala"}
        </Button>
      </div>
    </div>
  );
}
