"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obtenerSessionId, guardarViewToken } from "@/lib/utils/session";

const INTERVALO_POLL_MS = 2000;

export default function PartidaAleatoriaPage() {
  const router = useRouter();
  const { roster } = useRoster();
  const [nombre, setNombre] = useState("Jugador");
  const [mazo, setMazo] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function toggle(id: string) {
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]));
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function irASala(codigo: string, viewToken: string) {
    guardarViewToken(codigo, viewToken);
    router.push(`/jugar/sala/${codigo}`);
  }

  async function buscarOponente() {
    setBuscando(true);
    setError(null);
    const sessionId = obtenerSessionId();
    const res = await fetch("/api/game/queue/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, nombre, mazo }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBuscando(false);
      setError(json.error ?? "No se pudo buscar oponente.");
      return;
    }
    if (json.codigo) {
      irASala(json.codigo, json.viewToken);
      return;
    }
    // Encolado: consulta cada 2s hasta que alguien más nos empareje.
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/game/queue/status?sessionId=${encodeURIComponent(sessionId)}`);
      const j = await r.json();
      if (j.emparejado && j.codigo && j.viewToken) {
        if (pollRef.current) clearInterval(pollRef.current);
        irASala(j.codigo, j.viewToken);
      }
    }, INTERVALO_POLL_MS);
  }

  if (buscando) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="animate-pulse text-5xl">🔍</span>
        <p className="text-xl font-bold text-foreground">BUSCANDO OPONENTE...</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          No encontramos un oponente todavía. Puedes esperar o jugar contra la IA mientras tanto.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (pollRef.current) clearInterval(pollRef.current);
            setBuscando(false);
          }}
        >
          Cancelar búsqueda
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">🎲 Partida aleatoria</h1>
        <p className="text-sm text-foreground-muted">Arma tu mazo y te emparejamos con el primer oponente disponible.</p>
      </div>

      <Card className="p-4">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="mb-4" />
        <DeckBuilder titulo="Tu mazo" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} accentClass="text-affinity-venenoso" />
      </Card>

      {error && <p className="text-center text-sm text-state-danger">{error}</p>}

      <div className="flex justify-center">
        <Button onClick={buscarOponente} disabled={mazo.length === 0} className="px-8 py-3 text-base">
          🔍 Buscar oponente
        </Button>
      </div>
    </div>
  );
}
