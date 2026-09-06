-- Ejecuta esto una sola vez en el SQL Editor de Supabase.
-- Corrige "permission denied" tanto para lectura pública (anon) como para
-- las escrituras de administración (service_role / tu secret key): en este
-- proyecto los GRANT base no se heredaron automáticamente al crear las
-- tablas, y RLS por sí sola no alcanza sin ellos.

grant usage on schema public to anon, authenticated, service_role;

grant select on reptiles, abilities, engine_config to anon, authenticated;
grant all on reptiles, abilities, engine_config to service_role;

grant all on game_rooms, game_players, game_moves to service_role;
grant usage, select on all sequences in schema public to service_role;
