"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { parsearCodigoDesdeQR } from "@/lib/utils/sala-qr";

interface QrScannerModalProps {
  abierto: boolean;
  /** Se llama una sola vez con el código de sala ya validado (6 caracteres del alfabeto de salas). */
  onCodigo: (codigo: string) => void;
  onClose: () => void;
}

// BarcodeDetector aún no está en los tipos DOM de TypeScript.
interface DetectorQR {
  detect(fuente: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}
type ConstructorDetector = new (opciones: { formats: string[] }) => DetectorQR;

type EstadoCamara = "iniciando" | "escaneando" | "denegada" | "no-disponible" | "error";

const MENSAJE_ERROR: Record<Exclude<EstadoCamara, "iniciando" | "escaneando">, string> = {
  denegada: "No diste permiso a la cámara. Actívalo en el navegador o escribe el código a mano.",
  "no-disponible": "Este dispositivo o navegador no permite usar la cámara aquí (se necesita HTTPS). Escribe el código a mano.",
  error: "No pudimos abrir la cámara. Escribe el código a mano.",
};

/**
 * Escáner de QR dentro del propio juego. Usa BarcodeDetector nativo (Chrome/Android) y, donde no existe
 * (iPhone/Safari), carga @zxing/browser bajo demanda. Apaga la cámara al leer, al cerrar y al desmontar.
 */
export function QrScannerModal({ abierto, onCodigo, onClose }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<EstadoCamara>("iniciando");
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    let stream: MediaStream | null = null;
    let temporizador: ReturnType<typeof setInterval> | null = null;
    let detenerZxing: (() => void) | null = null;
    let ultimoAviso = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado("iniciando");
    setAviso(null);

    function apagar() {
      activo = false;
      if (temporizador) clearInterval(temporizador);
      detenerZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    function alLeer(texto: string) {
      if (!activo) return;
      const codigo = parsearCodigoDesdeQR(texto, window.location.origin);
      if (codigo) {
        apagar();
        onCodigo(codigo);
        return;
      }
      // QR ajeno: no se navega a ningún sitio; solo se avisa (como mucho cada 2 s).
      if (Date.now() - ultimoAviso > 2000) {
        ultimoAviso = Date.now();
        setAviso("Ese QR no es de una sala de Reptil Kombat.");
      }
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("no-disponible");
        return;
      }
      try {
        const Detector = (window as unknown as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;
        if (Detector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
          if (!activo) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          setEstado("escaneando");
          const detector = new Detector({ formats: ["qr_code"] });
          let leyendo = false;
          temporizador = setInterval(async () => {
            if (leyendo || !activo || video.readyState < 2) return;
            leyendo = true;
            try {
              const codigos = await detector.detect(video);
              if (codigos[0]) alLeer(codigos[0].rawValue);
            } catch {
              /* un fotograma sin QR legible no es un error */
            } finally {
              leyendo = false;
            }
          }, 250);
          return;
        }

        // Fallback (iPhone/Safari): zxing se descarga solo cuando hace falta.
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!activo) return;
        const lector = new BrowserQRCodeReader();
        const video = videoRef.current;
        if (!video) return;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setEstado("escaneando");
        const controles = await lector.decodeFromStream(stream, video, (resultado) => {
          if (resultado) alLeer(resultado.getText());
        });
        detenerZxing = () => controles.stop();
        if (!activo) controles.stop();
      } catch (e) {
        if (!activo) return;
        const nombre = e instanceof DOMException ? e.name : "";
        setEstado(nombre === "NotAllowedError" || nombre === "SecurityError" ? "denegada" : nombre === "NotFoundError" ? "no-disponible" : "error");
      }
    }

    iniciar();
    return apagar;
  }, [abierto, onCodigo]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, onClose]);

  const hayError = estado === "denegada" || estado === "no-disponible" || estado === "error";

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label="Escanear código QR"
          className="fixed inset-0 z-50 flex flex-col bg-black"
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] text-white">
            <p className="text-base font-black">📷 Escanea el QR de la sala</p>
            <button type="button" onClick={onClose} aria-label="Cerrar cámara" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg">
              ✕
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {/* playsInline + muted: obligatorios para que iOS reproduzca el video dentro de la página */}
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
            {!hayError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[62vmin] w-[62vmin] max-h-80 max-w-80 rounded-3xl border-4 border-reptile-green shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]" />
              </div>
            )}
            {estado === "iniciando" && <p className="absolute inset-x-0 top-6 text-center text-sm text-white/80">Abriendo cámara…</p>}
            {hayError && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-xs rounded-2xl bg-panel p-4 text-center text-sm text-foreground">{MENSAJE_ERROR[estado]}</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center">
            {aviso && <p className="mb-2 text-sm font-semibold text-state-warn">{aviso}</p>}
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-white/15 px-6 text-sm font-bold text-white">
              {hayError ? "Escribir el código a mano" : "Cancelar"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
