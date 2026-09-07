-- Reptiles RPG · modo JUGAR online real (salas por código, matchmaking)

alter table game_rooms
  add column if not exists estado_sala text not null default 'WAITING'
    check (estado_sala in ('WAITING', 'READY', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
  add column if not exists modo text not null default 'amigo' check (modo in ('amigo', 'aleatorio')),
  add column if not exists mazo_a jsonb,
  add column if not exists mazo_b jsonb,
  add column if not exists ganador text check (ganador in ('A', 'B')),
  add column if not exists finalizado_en timestamptz;

create unique index if not exists game_rooms_codigo_idx on game_rooms(codigo);

alter table game_players
  add column if not exists session_id text,
  add column if not exists view_token text;

update game_players set session_id = 'legacy' where session_id is null;
update game_players set view_token = encode(gen_random_bytes(16), 'hex') where view_token is null;

alter table game_players
  alter column session_id set not null,
  alter column view_token set not null;

create unique index if not exists game_players_view_token_idx on game_players(view_token);
create unique index if not exists game_players_room_lado_idx on game_players(room_id, lado);

create table if not exists matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  nombre text not null,
  mazo jsonb not null,
  creado_en timestamptz not null default now(),
  emparejado_codigo text
);

create index if not exists matchmaking_queue_creado_en_idx on matchmaking_queue(creado_en);

alter table matchmaking_queue enable row level security;

-- Mismo patrón que el resto de tablas de juego: sin políticas públicas, todo
-- pasa por Route Handlers con service_role (src/lib/supabase/admin.ts).
grant all on matchmaking_queue to service_role;
