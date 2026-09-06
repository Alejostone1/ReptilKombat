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
const INATURALIST_API_URL = process.env.NEXT_PUBLIC_INATURALIST_API_URL ?? "https://api.inaturalist.org/v1";
const GBIF_API_URL = process.env.NEXT_PUBLIC_GBIF_API_URL ?? "https://api.gbif.org/v1";

const GALLERY_CACHE_KEY = "reptiles-rpg-gallery-cache-v1";
const galleryMemoryCache = new Map<string, ReptileImageResult[]>();

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

interface INaturalistTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  default_photo?: { medium_url?: string; attribution?: string };
  taxon_photos?: { photo: { medium_url?: string; attribution?: string } }[];
}

/** Un resultado de iNaturalist (foto principal), usado por buscarImagenReptil. */
async function fetchINaturalist(nombreCientifico: string): Promise<ReptileImageResult | null> {
  try {
    const taxon = await fetchINaturalistTaxon(nombreCientifico);
    const url = taxon?.default_photo?.medium_url;
    if (!taxon || !url) return null;
    return {
      url,
      fuente: `https://www.inaturalist.org/taxa/${taxon.id}`,
      autor: stripHtml(taxon.default_photo?.attribution),
      esFallback: false,
    };
  } catch {
    return null;
  }
}

/** Busca el taxón en iNaturalist y trae varias fotos del mismo (taxon_photos). */
async function fetchINaturalistTaxon(nombreCientifico: string): Promise<INaturalistTaxon | null> {
  const params = new URLSearchParams({ q: nombreCientifico, rank: "species", is_active: "true", per_page: "1" });
  const res = await fetch(`${INATURALIST_API_URL}/taxa?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const best: INaturalistTaxon | undefined = json?.results?.[0];
  if (!best) return null;

  // Segunda llamada al taxón completo para traer varias fotos (taxon_photos),
  // no solo la default_photo del resultado de búsqueda.
  try {
    const detailRes = await fetch(`${INATURALIST_API_URL}/taxa/${best.id}`, {
      headers: { Accept: "application/json" },
    });
    if (detailRes.ok) {
      const detailJson = await detailRes.json();
      const detail: INaturalistTaxon | undefined = detailJson?.results?.[0];
      if (detail) return detail;
    }
  } catch {
    // si falla el detalle, seguimos con lo que trajo la búsqueda
  }
  return best;
}

interface GbifOccurrenceMedia {
  identifier?: string;
  references?: string;
}

/**
 * GBIF se usa sobre todo para validar taxonomía (ver lib/services/taxonomy.ts)
 * y como fuente de imágenes de respaldo vía registros de ocurrencia con foto.
 */
async function fetchGBIF(nombreCientifico: string): Promise<ReptileImageResult[]> {
  try {
    const matchParams = new URLSearchParams({ name: nombreCientifico });
    const matchRes = await fetch(`${GBIF_API_URL}/species/match?${matchParams.toString()}`);
    if (!matchRes.ok) return [];
    const match = await matchRes.json();
    const scientificName: string | undefined = match?.canonicalName ?? match?.species;
    if (!scientificName) return [];

    const occParams = new URLSearchParams({
      scientificName,
      mediaType: "StillImage",
      limit: "5",
    });
    const occRes = await fetch(`${GBIF_API_URL}/occurrence/search?${occParams.toString()}`);
    if (!occRes.ok) return [];
    const occJson = await occRes.json();
    const results: { media?: GbifOccurrenceMedia[] }[] = occJson?.results ?? [];

    const urls = new Set<string>();
    for (const r of results) {
      for (const m of r.media ?? []) {
        if (m.identifier) urls.add(m.identifier);
      }
    }
    return Array.from(urls)
      .slice(0, 4)
      .map((url) => ({ url, fuente: "GBIF", esFallback: false }));
  } catch {
    return [];
  }
}

/**
 * Busca una imagen real de un reptil a partir de su nombre científico, en este orden:
 * 1. Caché en memoria / localStorage.
 * 2. Wikipedia REST API (resumen de la especie).
 * 3. Wikimedia Commons (búsqueda de archivo por nombre científico).
 * 4. iNaturalist (foto del taxón).
 * 5. Imagen fallback local si todo lo anterior falla.
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
    (await fetchINaturalist(nombreCientifico)) ??
    FALLBACK_IMAGE;

  memoryCache.set(nombreCientifico, resultado);
  if (!resultado.esFallback) {
    const cache = readPersistentCache();
    cache[nombreCientifico] = resultado;
    writePersistentCache(cache);
  }
  return resultado;
}

/**
 * Trae VARIAS imágenes reales del mismo animal, combinando Wikipedia,
 * Wikimedia Commons, iNaturalist y GBIF, deduplicadas por URL. Usada por
 * ReptileGallery en la ficha del personaje (no en cards/tablas, por costo).
 */
export async function buscarImagenesReptil(
  nombreCientifico: string,
  { limit = 6 }: { limit?: number } = {},
): Promise<ReptileImageResult[]> {
  if (galleryMemoryCache.has(nombreCientifico)) return galleryMemoryCache.get(nombreCientifico)!.slice(0, limit);

  const persisted = readGalleryCache();
  if (persisted[nombreCientifico]?.length) {
    galleryMemoryCache.set(nombreCientifico, persisted[nombreCientifico]);
    return persisted[nombreCientifico].slice(0, limit);
  }

  const taxon = await fetchINaturalistTaxon(nombreCientifico).catch(() => null);
  const inatPhotos: ReptileImageResult[] = (taxon?.taxon_photos ?? [])
    .map((tp) => tp.photo.medium_url)
    .filter((url): url is string => Boolean(url))
    .map((url, i) => ({
      url,
      fuente: `https://www.inaturalist.org/taxa/${taxon!.id}`,
      autor: stripHtml(taxon?.taxon_photos?.[i]?.photo.attribution),
      esFallback: false,
    }));

  const [wiki, commons, gbif] = await Promise.all([
    fetchWikipediaSummary(nombreCientifico),
    fetchWikimediaCommons(nombreCientifico),
    fetchGBIF(nombreCientifico),
  ]);

  const combinadas = [wiki, commons, ...inatPhotos, ...gbif].filter(
    (r): r is ReptileImageResult => r !== null,
  );

  const vistos = new Set<string>();
  const unicas = combinadas.filter((r) => {
    if (vistos.has(r.url)) return false;
    vistos.add(r.url);
    return true;
  });

  const resultado = unicas.length > 0 ? unicas : [FALLBACK_IMAGE];

  galleryMemoryCache.set(nombreCientifico, resultado);
  if (unicas.length > 0) {
    const cache = readGalleryCache();
    cache[nombreCientifico] = resultado;
    writeGalleryCache(cache);
  }

  return resultado.slice(0, limit);
}

function readGalleryCache(): Record<string, ReptileImageResult[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GALLERY_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeGalleryCache(cache: Record<string, ReptileImageResult[]>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // almacenamiento no disponible: se ignora, la caché en memoria sigue funcionando
  }
}
