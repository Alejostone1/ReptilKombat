/**
 * Recorre los 40 reptiles del roster semilla y cruza su nombre científico +
 * familia contra el backbone taxonómico de GBIF, reportando discrepancias
 * por consola. No modifica ningún dato: es solo un diagnóstico para que el
 * usuario decida si vale la pena corregir algo en src/data/reptiles.ts.
 *
 * Uso: npx tsx scripts/check-taxonomy.ts
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local", override: true });

import { REPTILES_BASE } from "../src/data/reptiles";
import { verificarTaxonomia } from "../src/lib/services/taxonomy";

async function main() {
  console.log(`Verificando taxonomía de ${REPTILES_BASE.length} reptiles contra GBIF...\n`);
  let alertas = 0;

  for (const r of REPTILES_BASE) {
    const check = await verificarTaxonomia(r.nombreCientifico, r.familia);
    if (check.alerta) {
      alertas++;
      console.log(`⚠️  ${r.nombre} (${r.nombreCientifico})`);
      console.log(`    ${check.alerta}`);
      if (check.gbif) {
        console.log(`    GBIF: familia=${check.gbif.familia ?? "?"} género=${check.gbif.genero ?? "?"} status=${check.gbif.status}`);
      }
      console.log("");
    }
    // pequeña pausa para no saturar la API pública de GBIF
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`Listo. ${alertas} de ${REPTILES_BASE.length} reptiles con alguna discrepancia frente a GBIF.`);
}

main();
