-- Reptiles RPG · esquema base (roster, habilidades, configuración del motor)

create table if not exists reptiles (
  id text primary key,
  numero integer not null,
  nombre text not null,
  nombre_cientifico text not null,
  familia text not null,
  genero text,
  afinidad text not null,
  rol_tactico text not null,
  habitat text not null,
  distribucion text not null,
  descripcion text not null,
  imagen_url text,
  imagen_fuente text,
  imagen_autor text,
  hp integer not null,
  atk integer not null,
  def integer not null,
  spd integer not null,
  inst integer not null,
  adp integer not null,
  pasiva text,
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now()
);

create table if not exists abilities (
  id text primary key,
  nombre text not null,
  propietario_id text not null references reptiles(id) on delete cascade,
  afinidad text not null,
  potencia integer not null,
  precision integer not null,
  categoria text not null,
  efecto text not null,
  cooldown integer,
  prioridad integer,
  descripcion text
);

create index if not exists abilities_propietario_id_idx on abilities(propietario_id);

create table if not exists engine_config (
  id integer primary key default 1,
  ventaja numeric not null default 1.25,
  neutral numeric not null default 1.0,
  desventaja numeric not null default 0.8,
  stab numeric not null default 1.1,
  bst_estandar integer not null default 360,
  win_rate_dominante numeric not null default 55,
  win_rate_debil numeric not null default 45,
  offset_atk_def integer not null default 20,
  divisor_dano numeric not null default 10,
  constraint engine_config_singleton check (id = 1)
);

insert into engine_config (id) values (1) on conflict (id) do nothing;

alter table reptiles enable row level security;
alter table abilities enable row level security;
alter table engine_config enable row level security;

-- Lectura pública (el sitio es una herramienta de consulta abierta).
-- drop+create hace la migración segura de re-ejecutar (CREATE POLICY no soporta IF NOT EXISTS).
drop policy if exists "reptiles_select_public" on reptiles;
create policy "reptiles_select_public" on reptiles for select using (true);

drop policy if exists "abilities_select_public" on abilities;
create policy "abilities_select_public" on abilities for select using (true);

drop policy if exists "engine_config_select_public" on engine_config;
create policy "engine_config_select_public" on engine_config for select using (true);

-- Sin políticas de insert/update/delete para el rol anon/authenticated:
-- todas las escrituras pasan por Route Handlers con la clave service_role,
-- que ignora RLS por diseño de Supabase.

-- RLS por sí sola no alcanza: Postgres primero exige el GRANT base de la
-- tabla al rol, y solo después evalúa las políticas de RLS. Sin este GRANT,
-- anon/authenticated reciben "permission denied" aunque la policy diga true.
-- Lo mismo aplica a service_role (usado por Route Handlers de /api/admin):
-- BYPASSRLS no sustituye el GRANT base de la tabla.
grant usage on schema public to anon, authenticated, service_role;
grant select on reptiles, abilities, engine_config to anon, authenticated;
grant all on reptiles, abilities, engine_config to service_role;
grant usage, select on all sequences in schema public to service_role;
