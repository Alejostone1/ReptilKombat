-- Una sala en WAITING (creada por "Crear con amigo", antes de que el rival se una)
-- todavia no tiene una partida real: `estado` debe poder ser null hasta el join.
alter table public.game_rooms alter column estado drop not null;
