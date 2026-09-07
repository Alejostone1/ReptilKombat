"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obtenerSessionId, guardarViewToken } from "@/lib/utils/session";

export default function UnirseAPartidaPage() {
  const router = useRouter();
  const { roster } = useRoster();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("Jugador 2");
  const [mazo, setMazo] = useState<string[]>([]);
  const [uniendo, setUniendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_CARTAS_MAZO ? prev : [...prev, id]));
  }

  async function unirse() {
    const codigoLimpio = codigo.trim().toUpperCase();
    if (!codigoLimpio) {
      setError("Escribe el código de partida.");
      return;
    }
    setUniendo(true);
    setError(null);
    const res = await fetch(`/api/game/rooms/${codigoLimpio}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: obtenerSessionId(), nombre, mazo }),
    });
    const json = await res.json();
    setUniendo(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo unir a la partida.");
      return;
    }
    guardarViewToken(codigoLimpio, json.viewToken);
    router.push(`/jugar/sala/${codigoLimpio}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">🔑 Unirse a partida</h1>
        <p className="text-sm text-foreground-muted">Introduce el código que te compartió tu oponente.</p>
      </div>

      <Card className="space-y-3 p-4">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
        <Input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="CÓDIGO DE PARTIDA"
          maxLength={6}
          className="text-center text-2xl font-black tracking-[0.3em]"
        />
      </Card>

      <Card className="p-4">
        <DeckBuilder titulo="Tu mazo" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} accentClass="text-affinity-termico" />
      </Card>

      {error && <p className="text-center text-sm text-state-danger">{error}</p>}

      <div className="flex justify-center">
        <Button onClick={unirse} disabled={mazo.length === 0 || uniendo} className="px-8 py-3 text-base">
          {uniendo ? "Uniéndose..." : "⚔️ Unirse"}
        </Button>
      </div>
    </div>
  );
}
