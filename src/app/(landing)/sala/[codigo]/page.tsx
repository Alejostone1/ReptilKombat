"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { leerViewToken } from "@/lib/utils/session";
import { normalizarCodigo } from "@/lib/utils/sala-qr";

/**
 * Enlace corto que lleva el QR (`/sala/CODIGO`). Si este dispositivo ya tiene asiento en la sala vuelve
 * a ella; si no, abre "Unirse" con el código precargado.
 */
export default function EnlaceSalaPage() {
  const params = useParams<{ codigo: string }>();
  const router = useRouter();

  useEffect(() => {
    const codigo = normalizarCodigo(params.codigo ?? "");
    if (!codigo) {
      router.replace("/jugar/unirse");
      return;
    }
    router.replace(leerViewToken(codigo) ? `/jugar/sala/${codigo}` : `/jugar/unirse?codigo=${codigo}`);
  }, [params.codigo, router]);

  return <p className="p-8 text-center text-sm text-foreground-muted">Entrando a la sala…</p>;
}
