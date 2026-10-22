"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { buscarImagenReptil, type ReptileImageResult } from "@/lib/services/images";
import { cn } from "@/lib/utils";

interface ReptileImageProps {
  nombreCientifico: string;
  nombre: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** En las cartas de juego la fuente de la foto no se pinta encima (queda como tooltip) para no ensuciar la carta. */
  sinCredito?: boolean;
}

export function ReptileImage({ nombreCientifico, nombre, className, sizes, priority, sinCredito }: ReptileImageProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [result, setResult] = useState<ReptileImageResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    buscarImagenReptil(nombreCientifico).then((r) => {
      if (cancelled) return;
      setResult(r);
      setState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [nombreCientifico]);

  const src = state === "error" ? "/reptile-fallback.svg" : (result?.url ?? "/reptile-fallback.svg");

  return (
    <div className={cn("relative overflow-hidden bg-[#0D1C18]", className)} title={sinCredito && result && !result.esFallback ? `Foto: ${result.fuente}` : undefined}>
      {state === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#122720] to-[#0D1C18]" />
      )}
      <Image
        src={src}
        alt={`Fotografía real de ${nombre} (${nombreCientifico})`}
        fill
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        sizes={sizes ?? "(max-width: 768px) 100vw, 400px"}
        className={cn("object-cover transition-opacity duration-300", state === "loading" ? "opacity-0" : "opacity-100")}
        onError={() => setState("error")}
        unoptimized={src.startsWith("http")}
      />
      {!sinCredito && result && !result.esFallback && (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/70">
          {result.fuente.includes("wikipedia.org") ? "Wikipedia" : result.fuente}
        </span>
      )}
    </div>
  );
}
