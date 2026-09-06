-- Reptiles RPG · modo JUGAR online (preparado, no usado hasta activar Supabase Realtime)

create extension if not exists pgcrypto;

create table if not exists game_rooms (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  estado jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  nombre text not null,
  lado text not null check (lado in ('A', 'B')),
  conectado_en timestamptz not null default now()
);

create table if not exists game_moves (
  id bigint generated always as identity primary key,
  room_id uuid not null references game_rooms(id) on delete cascade,
  lado text not null check (lado in ('A', 'B')),
  accion jsonb not null,
  creado_en timestamptz not null default now()
);

create index if not exists game_players_room_id_idx on game_players(room_id);
create index if not exists game_moves_room_id_idx on game_moves(room_id);

alter table game_rooms enable row level security;
alter table game_players enable row level security;
alter table game_moves enable row level security;

-- Sin políticas públicas todavía: estas tablas quedan bloqueadas para el
-- cliente hasta que se active el modo online (Fase futura), momento en el
-- que se añadirán políticas acotadas por room_id/código de sala.
grant all on game_rooms, game_players, game_moves to service_role;
