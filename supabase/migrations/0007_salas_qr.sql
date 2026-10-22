-- Fase 4: salas con QR y desconexión. Solo columnas nuevas con default (aditivo: no toca nada existente).

-- Las salas en espera caducan (el QR/código no sirve para siempre). NULL = sin caducidad (salas anteriores).
alter table public.game_rooms add column if not exists expira_en timestamptz;
-- Formato de la sala; '1v1' es el comportamiento de siempre. La Fase 5 añadirá '2v2'.
alter table public.game_rooms add column if not exists formato text not null default '1v1';

-- Latido del jugador: se actualiza con cada ping/acción. Si el rival lleva más de 60 s sin señal, pierde por abandono.
alter table public.game_players add column if not exists last_seen timestamptz not null default now();
