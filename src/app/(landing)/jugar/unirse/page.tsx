"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { DeckBuilder } from "@/components/cards/DeckBuilder";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { obtenerSessionId, guardarViewToken } from "@/lib/utils/session";
import { normalizarCodigo } from "@/lib/utils/sala-qr";
import { FEATURES } from "@/config/features";
import { QrScannerModal } from "@/components/cards/QrScannerModal";

type AvisoSala = { tono: "ok" | "error"; texto: string } | null;

export default function UnirseAPartidaPage() {
  // useSearchParams exige Suspense para que la página siga prerenderizándose.
  return (
    <Suspense fallback={null}>
      <UnirseContenido />
    </Suspense>
  );
}

function UnirseContenido() {
  const router = useRouter();
  const params = useSearchParams();
  const { roster } = useRoster();
  const [codigo, setCodigo] = useState(() => normalizarCodigo(params.get("codigo") ?? "") ?? "");
  const [nombre, setNombre] = useState("Jugador 2");
  const [mazo, setMazo] = useState<string[]>([]);
  const [uniendo, setUniendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [aviso, setAviso] = useState<AvisoSala>(null);

  // Antes de elegir mazo, comprueba si el código sirve (existe / llena / venció).
  useEffect(() => {
    const limpio = normalizarCodigo(codigo);
    if (!limpio) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAviso(null);
      return;
    }
    let cancelado = false;
    fetch(`/api/game/rooms/${limpio}/info`)
      .then((r) => r.json())
      .then((info) => {
        if (cancelado) return;
        if (!info.existe) setAviso({ tono: "error", texto: "No existe una sala con ese código." });
        else if (info.vencida) setAviso({ tono: "error", texto: "Esa sala venció. Pídele a tu rival que cree una nueva." });
        else if (info.llena) setAviso({ tono: "error", texto: "Esa sala ya está llena o ya empezó." });
        else setAviso({ tono: "ok", texto: "✅ Sala lista. ¡Elige tu mazo y entra!" });
      })
      .catch(() => !cancelado && setAviso(null));
    return () => {
      cancelado = true;
    };
  }, [codigo]);

  const alEscanear = useCallback((c: string) => {
    setCodigo(c);
    setEscaneando(false);
  }, []);

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
        {FEATURES.ONLINE_QR && (
          <Button variant="outline" onClick={() => setEscaneando(true)} className="w-full">
            📷 Escanear QR con la cámara
          </Button>
        )}
        {aviso && <p className={aviso.tono === "ok" ? "text-center text-sm text-state-ok" : "text-center text-sm text-state-danger"}>{aviso.texto}</p>}
      </Card>

      <Card className="p-4">
        <DeckBuilder titulo="Tu mazo" roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} accentClass="text-affinity-termico" />
      </Card>

      {error && <p className="text-center text-sm text-state-danger">{error}</p>}

      <QrScannerModal abierto={escaneando} onCodigo={alEscanear} onClose={() => setEscaneando(false)} />

      <div className="flex justify-center">
        <Button onClick={unirse} disabled={mazo.length === 0 || uniendo || aviso?.tono === "error"} className="px-8 py-3 text-base">
          {uniendo ? "Uniéndose..." : "⚔️ Unirse"}
        </Button>
      </div>
    </div>
  );
}
