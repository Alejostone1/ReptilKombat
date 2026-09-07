const SESSION_KEY = "reptiles-rpg-session-id";

/** Identificador anónimo por navegador (sin login), usado para identificar el asiento de cada jugador en una sala. */
export function obtenerSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function claveToken(codigo: string): string {
  return `reptiles-rpg-room-token-${codigo}`;
}

export function guardarViewToken(codigo: string, viewToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(claveToken(codigo), viewToken);
}

export function leerViewToken(codigo: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(claveToken(codigo));
}
