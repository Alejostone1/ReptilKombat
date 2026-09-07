-- Fase 2: energía, cooldown, estados, críticos, multiplicadores por categoría, analítica real.

alter table reptiles add column if not exists energia_max integer not null default 100;
alter table reptiles add column if not exists critico_probabilidad integer not null default 10; -- %

alter table abilities add column if not exists costo_energia integer not null default 0;
-- Reemplaza el uso del `cooldown` legacy (nunca leído por el motor, valores decorativos 12-18):
-- unidad clara desde el inicio = turnos reales de cooldown.
alter table abilities add column if not exists cooldown_turnos integer not null default 0;
alter table abilities add column if not exists tipo_efecto text;
alter table abilities add constraint abilities_tipo_efecto_check
  check (tipo_efecto is null or tipo_efecto in (
    'veneno', 'debuff_atk', 'debuff_def', 'buff_atk', 'buff_def', 'buff_spd', 'curacion'
  ));
alter table abilities add column if not exists efecto_magnitud integer; -- % o valor plano según tipo_efecto
alter table abilities add column if not exists efecto_turnos integer; -- duración; null/0 = instantáneo (curación)

alter table engine_config add column if not exists categoria_normal_mult numeric not null default 1.0;
alter table engine_config add column if not exists categoria_especial_mult numeric not null default 1.3;
alter table engine_config add column if not exists categoria_control_mult numeric not null default 0.7;
alter table engine_config add column if not exists critico_multiplicador numeric not null default 1.6;
alter table engine_config add column if not exists energia_regen_turno integer not null default 20;

-- Rebalance del ritmo de combate: menos turnos, ventaja de afinidad más significativa.
-- divisor_dano=4.8 (no 5) está calibrado para que el promedio de golpes-para-derrotar de un
-- ataque Normal caiga en 3-6 sobre una muestra del roster real (ver damage.test.ts).
update engine_config set divisor_dano = 4.8, ventaja = 1.4, desventaja = 0.7 where id = 1;

-- Analítica real de partidas online (no simulada): se puebla cuando una partida termina.
create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references game_rooms(id) on delete set null,
  ganador_lado text not null check (ganador_lado in ('A', 'B')),
  reptiles_a jsonb not null,
  reptiles_b jsonb not null,
  turnos integer not null,
  duracion_segundos integer,
  creado_en timestamptz not null default now()
);

grant all on match_results to service_role;
