-- Preparación (sin UI): familia de cada animal, para poder sumar acuáticos, aves, etc. más adelante
-- sin tocar la lógica de combate. Aditiva: todos los animales actuales quedan como 'reptil'.
alter table public.reptiles add column if not exists family text not null default 'reptil';
