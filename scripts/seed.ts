/**
 * Siembra el roster estático (src/data/reptiles.ts + abilities.ts) en Supabase.
 * Requiere que las migraciones de supabase/migrations/*.sql ya se hayan
 * ejecutado (tablas reptiles/abilities creadas) y que SUPABASE_SECRET_KEY
 * esté definida en .env.local.
 *
 * Uso: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { REPTILES_BASE } from "../src/data/reptiles";
import { ABILITIES } from "../src/data/abilities";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.\n" +
        "Ve a Project Settings -> API Keys -> 'secret key' en Supabase y pégala en .env.local.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

  console.log(`Insertando ${REPTILES_BASE.length} reptiles...`);
  const reptileRows = REPTILES_BASE.map((r) => ({
    id: r.id,
    numero: r.numero,
    nombre: r.nombre,
    nombre_cientifico: r.nombreCientifico,
    familia: r.familia,
    genero: r.genero ?? null,
    afinidad: r.afinidad,
    rol_tactico: r.rolTactico,
    habitat: r.habitat,
    distribucion: r.distribucion,
    descripcion: r.descripcion,
    imagen_url: r.imagenUrl ?? null,
    imagen_fuente: r.imagenFuente ?? null,
    imagen_autor: r.imagenAutor ?? null,
    hp: r.hp,
    atk: r.atk,
    def: r.def,
    spd: r.spd,
    inst: r.inst,
    adp: r.adp,
    pasiva: r.pasiva ?? null,
    activo: true,
  }));

  const { error: reptileError } = await supabase.from("reptiles").upsert(reptileRows, { onConflict: "id" });
  if (reptileError) {
    console.error("Error insertando reptiles:", reptileError.message);
    process.exit(1);
  }

  console.log(`Insertando ${ABILITIES.length} habilidades...`);
  const abilityRows = ABILITIES.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    propietario_id: a.propietarioId,
    afinidad: a.afinidad,
    potencia: a.potencia,
    precision: a.precision,
    categoria: a.categoria,
    efecto: a.efecto,
    cooldown: a.cooldown ?? null,
    prioridad: a.prioridad ?? null,
    descripcion: a.descripcion ?? null,
  }));

  const { error: abilityError } = await supabase.from("abilities").upsert(abilityRows, { onConflict: "id" });
  if (abilityError) {
    console.error("Error insertando habilidades:", abilityError.message);
    process.exit(1);
  }

  const { count: reptileCount } = await supabase.from("reptiles").select("*", { count: "exact", head: true });
  const { count: abilityCount } = await supabase.from("abilities").select("*", { count: "exact", head: true });

  console.log(`Listo. reptiles=${reptileCount} abilities=${abilityCount}`);
}

main();
