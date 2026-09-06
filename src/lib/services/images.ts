export interface ReptileImageResult {
  url: string;
  fuente: string;
  autor?: string;
  esFallback: boolean;
}

const FALLBACK_IMAGE: ReptileImageResult = {
  url: "/reptile-fallback.svg",
  fuente: "Ilustración local de respaldo",
  esFallback: true,
};

const CACHE_KEY = "reptiles-rpg-image-cache-v1";
const memoryCache = new Map<string, ReptileImageResult>();

const WIKIPEDIA_API_URL =
  process.env.NEXT_PUBLIC_WIKIPEDIA_API_URL ?? "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIMEDIA_API_URL = process.env.NEXT_PUBLIC_WIKIMEDIA_API_URL ?? "https://commons.wikimedia.org/w/api.php";

function readPersistentCache(): Record<string, ReptileImageResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePersistentCache(cache: Record<string, ReptileImageResult>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // almacenamiento no disponible: se ignora, la caché en memoria sigue funcionando
  }
}

async function fetchWikipediaSummary(nombreCientifico: string): Promise<ReptileImageResult | null> {
  try {
    const res = await fetch(`${WIKIPEDIA_API_URL}/${encodeURIComponent(nombreCientifico)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const url: string | undefined = json?.thumbnail?.source ?? json?.originalimage?.source;
    if (!url) return null;
    return {
      url,
      fuente: json?.content_urls?.desktop?.page ?? "Wikipedia",
      autor: "Wikipedia (ver ficha para atribución completa)",
      esFallback: false,
    };
  } catch {
    return null;
  }
}

interface CommonsPage {
  imageinfo?: {
    url: string;
    extmetadata?: { Artist?: { value: string } };
  }[];
}

async function fetchWikimediaCommons(nombreCientifico: string): Promise<ReptileImageResult | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: nombreCientifico,
      gsrlimit: "1",
      gsrnamespace: "6",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`${WIKIMEDIA_API_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    const pages = json?.query?.pages as Record<string, CommonsPage> | undefined;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    const info = page?.imageinfo?.[0];
    if (!info?.url) return null;
    const meta = info.extmetadata ?? {};
    return {
      url: info.url,
      fuente: "Wikimedia Commons",
      autor: stripHtml(meta.Artist?.value) || undefined,
      esFallback: false,
    };
  } catch {
    return null;
  }
}

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, "").trim() || undefined;
}

/**
 * Busca una imagen real de un reptil a partir de su nombre científico, en este orden:
 * 1. Caché en memoria / localStorage.
 * 2. Wikipedia REST API (resumen de la especie).
 * 3. Wikimedia Commons (búsqueda de archivo por nombre científico).
 * 4. Imagen fallback local si todo lo anterior falla.
 *
 * Nunca inventa URLs: si ninguna fuente responde, se usa el fallback explícitamente marcado.
 */
export async function buscarImagenReptil(nombreCientifico: string): Promise<ReptileImageResult> {
  if (memoryCache.has(nombreCientifico)) return memoryCache.get(nombreCientifico)!;

  const persisted = readPersistentCache();
  if (persisted[nombreCientifico]) {
    memoryCache.set(nombreCientifico, persisted[nombreCientifico]);
    return persisted[nombreCientifico];
  }

  const resultado =
    (await fetchWikipediaSummary(nombreCientifico)) ??
    (await fetchWikimediaCommons(nombreCientifico)) ??
    FALLBACK_IMAGE;

  memoryCache.set(nombreCientifico, resultado);
  if (!resultado.esFallback) {
    const cache = readPersistentCache();
    cache[nombreCientifico] = resultado;
    writePersistentCache(cache);
  }
  return resultado;
}
