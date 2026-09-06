"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { buscarImagenesReptil, type ReptileImageResult } from "@/lib/services/images";
import { cn } from "@/lib/utils";

interface ReptileGalleryProps {
  nombre: string;
  nombreCientifico: string;
  className?: string;
}

/** Galería de varias fotos reales del mismo animal (Wikipedia, Wikimedia, iNaturalist, GBIF). */
export function ReptileGallery({ nombre, nombreCientifico, className }: ReptileGalleryProps) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [images, setImages] = useState<ReptileImageResult[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    buscarImagenesReptil(nombreCientifico, { limit: 6 }).then((results) => {
      if (cancelled) return;
      setImages(results);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [nombreCientifico]);

  const current = images[active];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-panel-secondary">
        {status === "loading" && <div className="absolute inset-0 animate-pulse bg-panel-secondary" />}
        {current && (
          <Image
            src={current.url}
            alt={`Fotografía real de ${nombre} (${nombreCientifico})`}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            unoptimized={current.url.startsWith("http")}
            onError={() => setImages((prev) => prev.filter((_, i) => i !== active))}
          />
        )}
        {current && !current.esFallback && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/70">
            {current.fuente.includes("wikipedia.org")
              ? "Wikipedia"
              : current.fuente.includes("inaturalist")
                ? "iNaturalist"
                : current.fuente}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2",
                i === active ? "border-reptile-green" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
