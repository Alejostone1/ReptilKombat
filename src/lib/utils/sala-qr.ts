// Mismo alfabeto que generarCodigoSala(): sin 0/O, 1/I/L. Se duplica aquí para poder usarlo en el cliente
// (game-queries.ts importa "crypto" de Node).
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PATRON_CODIGO = new RegExp(`^[${ALFABETO_CODIGO}]{6}$`);

/** ¿Es un código de sala válido (6 caracteres del alfabeto de salas)? Normaliza a mayúsculas. */
export function normalizarCodigo(texto: string): string | null {
  const limpio = texto.trim().toUpperCase();
  return PATRON_CODIGO.test(limpio) ? limpio : null;
}

/** Enlace que lleva el QR: siempre del origen actual (nunca un dominio fijo). */
export function urlDeSala(origin: string, codigo: string): string {
  return `${origin.replace(/\/+$/, "")}/sala/${codigo}`;
}

/**
 * Extrae el código de sala de lo que leyó la cámara. Acepta solo (a) un enlace del MISMO origen con ruta
 * `/sala/CODIGO` o `/jugar/sala/CODIGO`, o (b) el código suelto. Cualquier otra cosa (un enlace de otro
 * sitio, texto cualquiera) devuelve null: el escáner nunca navega a donde dice un QR ajeno.
 */
export function parsearCodigoDesdeQR(texto: string, origin: string): string | null {
  const crudo = texto.trim();
  if (!crudo) return null;
  const suelto = normalizarCodigo(crudo);
  if (suelto) return suelto;
  let url: URL;
  try {
    url = new URL(crudo);
  } catch {
    return null;
  }
  let propio: string;
  try {
    propio = new URL(origin).origin;
  } catch {
    return null;
  }
  if (url.origin !== propio) return null;
  const m = url.pathname.match(/^\/(?:jugar\/)?sala\/([^/]+)\/?$/);
  return m ? normalizarCodigo(m[1]) : null;
}
