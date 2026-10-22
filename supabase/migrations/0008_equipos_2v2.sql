-- Fase 5: modo 2 vs 2. Aditivo: las filas 1 vs 1 existentes quedan con asiento = 1 y siguen siendo válidas.
-- En 2 vs 2, `lado` es el EQUIPO ('A' | 'B') y `asiento` el puesto dentro del equipo (1 | 2).

alter table public.game_players add column if not exists asiento smallint not null default 1;
-- Mazo elegido por el jugador mientras la sala espera a los otros (en 1 vs 1 sigue viviendo en game_rooms.mazo_a/mazo_b).
alter table public.game_players add column if not exists mazo jsonb;

-- Antes: un solo jugador por (sala, lado). Ahora: uno por (sala, equipo, asiento).
drop index if exists public.game_players_room_lado_idx;
create unique index if not exists game_players_room_lado_asiento_idx on public.game_players (room_id, lado, asiento);
