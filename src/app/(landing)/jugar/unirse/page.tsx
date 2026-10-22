"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoster } from "@/lib/hooks/useRoster";
import { MAX_CARTAS_MAZO } from "@/lib/card-game/types";
import { MAX_CARTAS_MAZO_2V2 } from "@/lib/card-game/engine-equipos";
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
  // Salas 2 vs 2: mazo de 2 cartas y elección de equipo (con cupo visible).
  const [formato, setFormato] = useState<"1v1" | "2v2">("1v1");
  const [asientos, setAsientos] = useState<{ A: number; B: number } | null>(null);
  const [equipo, setEquipo] = useState<"A" | "B" | "">("");
  const maxCartas = formato === "2v2" ? MAX_CARTAS_MAZO_2V2 : MAX_CARTAS_MAZO;

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
        setFormato(info.formato === "2v2" ? "2v2" : "1v1");
        setAsientos(info.asientos ?? null);
        if (info.formato === "2v2") setMazo((m) => m.slice(0, MAX_CARTAS_MAZO_2V2));
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
    setMazo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= maxCartas ? prev : [...prev, id]));
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
      body: JSON.stringify({ sessionId: obtenerSessionId(), nombre, mazo, ...(formato === "2v2" && equipo ? { equipo } : {}) }),
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
        {formato === "2v2" && aviso?.tono === "ok" && (
          <div className="space-y-2">
            <p className="text-center text-xs font-bold uppercase tracking-wide text-foreground-muted">👥 Sala 2 vs 2 — elige tu equipo</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["", "Automático", null],
                ["A", "Equipo A", asientos?.A ?? 0],
                ["B", "Equipo B", asientos?.B ?? 0],
              ] as const).map(([valor, etiqueta, ocupados]) => {
                const lleno = ocupados !== null && ocupados >= 2;
                return (
                  <button
                    key={valor}
                    type="button"
                    disabled={lleno}
                    onClick={() => setEquipo(valor)}
                    style={{ touchAction: "manipulation" }}
                    className={`min-h-12 rounded-xl border px-1 text-sm font-bold transition ${equipo === valor ? "border-reptile-green bg-reptile-green/15 text-reptile-green" : "border-border-subtle bg-panel-secondary text-foreground"} ${lleno ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {etiqueta}
                    {ocupados !== null && <span className="block text-[10px] font-normal text-foreground-muted">{lleno ? "lleno" : `${ocupados}/2`}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {aviso && <p className={aviso.tono === "ok" ? "text-center text-sm text-state-ok" : "text-center text-sm text-state-danger"}>{aviso.texto}</p>}
      </Card>

      <Card className="p-4">
        <DeckBuilder titulo={formato === "2v2" ? "Tu mazo (2 cartas)" : "Tu mazo"} roster={roster} seleccionados={mazo} bloqueados={[]} onToggle={toggle} accentClass="text-affinity-termico" maxCartas={maxCartas} />
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
