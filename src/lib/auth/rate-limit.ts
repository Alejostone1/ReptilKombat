import "server-only";

/**
 * Límite de intentos en memoria, ventana deslizante simple. En Vercel serverless esto vive por
 * instancia de función (no es un límite global perfecto entre instancias frías/múltiples), pero
 * frena de forma real el caso más común de fuerza bruta sin necesitar infraestructura nueva
 * (Redis, etc.) — suficiente para un panel de un único administrador.
 */
const intentos = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  permitido: boolean;
  intentosRestantes: number;
}

export function verificarLimite(clave: string, maxIntentos: number, ventanaMs: number): RateLimitResult {
  const ahora = Date.now();
  const actual = intentos.get(clave);

  if (!actual || ahora > actual.resetAt) {
    intentos.set(clave, { count: 1, resetAt: ahora + ventanaMs });
    return { permitido: true, intentosRestantes: maxIntentos - 1 };
  }

  if (actual.count >= maxIntentos) {
    return { permitido: false, intentosRestantes: 0 };
  }

  actual.count++;
  return { permitido: true, intentosRestantes: maxIntentos - actual.count };
}

/** IP del cliente a partir de los headers que Vercel/proxies estándar ya inyectan. */
export function obtenerIpCliente(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
