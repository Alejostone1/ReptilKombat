const GBIF_API_URL = process.env.NEXT_PUBLIC_GBIF_API_URL ?? "https://api.gbif.org/v1";

export interface TaxonomiaGBIF {
  nombreCientificoAceptado: string;
  familia?: string;
  genero?: string;
  reino?: string;
  status: string;
  confidence: number;
}

export interface VerificacionTaxonomia {
  nombreCientifico: string;
  familiaGuardada: string;
  gbif: TaxonomiaGBIF | null;
  coincideFamilia: boolean | null;
  alerta: string | null;
}

/** Consulta el backbone taxonómico de GBIF para un nombre científico dado. */
export async function fetchTaxonomiaGBIF(nombreCientifico: string): Promise<TaxonomiaGBIF | null> {
  try {
    const params = new URLSearchParams({ name: nombreCientifico });
    const res = await fetch(`${GBIF_API_URL}/species/match?${params.toString()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.scientificName) return null;
    return {
      nombreCientificoAceptado: json.canonicalName ?? json.species ?? json.scientificName,
      familia: json.family,
      genero: json.genus,
      reino: json.kingdom,
      status: json.status ?? "DESCONOCIDO",
      confidence: json.confidence ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Cruza el nombre científico + familia guardados en el roster contra GBIF.
 * Solo reporta discrepancias — nunca sobreescribe datos automáticamente,
 * la decisión de corregir queda en manos de quien diseña el roster.
 */
export async function verificarTaxonomia(nombreCientifico: string, familiaGuardada: string): Promise<VerificacionTaxonomia> {
  const gbif = await fetchTaxonomiaGBIF(nombreCientifico);
  if (!gbif) {
    return {
      nombreCientifico,
      familiaGuardada,
      gbif: null,
      coincideFamilia: null,
      alerta: "GBIF no devolvió coincidencia (revisar conexión o nombre).",
    };
  }

  const coincideFamilia = gbif.familia ? gbif.familia.toLowerCase() === familiaGuardada.toLowerCase() : null;
  let alerta: string | null = null;
  if (coincideFamilia === false) {
    alerta = `GBIF ubica a "${nombreCientifico}" en la familia "${gbif.familia}", no en "${familiaGuardada}".`;
  } else if (gbif.status && gbif.status !== "ACCEPTED") {
    alerta = `GBIF marca "${nombreCientifico}" como "${gbif.status}" (posible sinónimo de "${gbif.nombreCientificoAceptado}").`;
  }

  return { nombreCientifico, familiaGuardada, gbif, coincideFamilia, alerta };
}
