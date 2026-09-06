# 🦎 REPTILES RPG — Game Balance System

Herramienta profesional de **Game Design, Character Management, Combat Analysis y Balance Analytics** para un videojuego móvil de criaturas basado en reptiles reales, con un sistema estratégico de afinidades tipo piedra-papel-tijera (pero cerrado en 8 tipos, sin dominancia estructural) y un modo de juego de cartas por turnos.

40 reptiles reales (editables desde un panel de administración) · 8 afinidades balanceadas (2 ventajas / 2 desventajas / 4 neutrales cada una) · 160 habilidades · matriz de matchups 40×40 · motor de daño y balance centralizado · imágenes reales vía Wikipedia, Wikimedia Commons, iNaturalist y GBIF · base de datos real en Supabase · modo **Jugar** con motor de cartas por turnos.

## Instalación

```bash
git clone TU_REPOSITORIO
cd reptiles-rpg
npm install
```

Copia `.env.example` a `.env.local` y completa las variables de Supabase (ver "Base de datos" abajo). Luego:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Base de datos (Supabase)

El roster, las habilidades y la configuración del motor viven en Postgres (Supabase), no en archivos estáticos.

1. Crea un proyecto en [supabase.com](https://supabase.com) (gratis).
2. En el **SQL Editor** del proyecto, ejecuta en orden `supabase/migrations/0001_init.sql` y `supabase/migrations/0002_game_rooms.sql`.
3. En `.env.local`, completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys) y `SUPABASE_SECRET_KEY` (la "secret key", solo servidor — necesaria para sembrar datos y para el panel `/admin`).
4. Siembra los 40 reptiles + 160 habilidades semilla:
   ```bash
   npx tsx scripts/seed.ts
   ```
5. Elige una contraseña para `/admin` en `ADMIN_PASSWORD` (`.env.local`).

Si ves `permission denied for table ...` al leer o escribir, falta el `GRANT` base del rol en Postgres (RLS por sí sola no alcanza) — corre `scripts/fix-grants.sql` en el SQL Editor.

## Producción

```bash
npm run build
npm start
```

## Tests

```bash
npm run test
```

Valida automáticamente (contra los datos semilla, sin necesitar Supabase): el cierre de la matriz de afinidades (2/2/4 por tipo), BST = 360 en todo el roster, matchup en espejo = 50/50, detección de personajes dominantes/débiles, y el motor de cartas del modo Jugar (el daño de un ataque coincide exactamente con `calculateDamage()`).

## Arquitectura

```
src/
  app/
    (páginas de consulta)  # dashboard, roster, reptiles/[id], comparador, simulador,
                            # matchups, ranking, afinidades, habilidades, auditoria,
                            # nuevo-personaje, familias, configuracion
    jugar/                  # Lobby (armar mazo) y mesa/ (tablero de combate por turnos)
    admin/                  # Panel protegido: CRUD de reptiles y habilidades
    api/admin/              # Route Handlers: login/logout/me + CRUD (service_role)
  components/
    layout/                # Sidebar, AppShell, RosterProvider, GlobalSearch (Ctrl+K)
    dashboard/, reptiles/, combat/, charts/, affinities/, abilities/, ui/
    cards/                  # GameCard, Board, TurnBanner, AttackAnimation, DeckBuilder
    admin/                  # AdminGate (login), ReptileEditorForm (crear/editar)
  lib/
    game-engine/            # ÚNICA fuente de verdad para toda fórmula de balance
      config.ts, stats.ts, affinities.ts, damage.ts, matchups.ts, balance.ts, stat-labels.ts
    card-game/              # Motor del modo Jugar: reducer puro (state, action) => state
      types.ts, engine.ts    # reutiliza calculateDamage()/getAffinityMultiplier() — mismo motor
    supabase/               # client.ts (navegador), server.ts (SSR), admin.ts (service_role),
                            # queries.ts (mappers camelCase<->snake_case), types.ts
    services/               # images.ts (Wikipedia/Wikimedia/iNaturalist/GBIF), taxonomy.ts (GBIF)
    auth/admin-session.ts   # Cookie firmada (HMAC) para proteger /admin y /api/admin/*
    store/                  # roster-store (Zustand, respaldado por Supabase), config-store,
                            # game-store (estado de la partida en curso)
    hooks/                  # useRoster, useEngineData, useAdminAuth
  data/                     # Roster/habilidades SEMILLA (para scripts/seed.ts, ya no en runtime)
  types/                    # Reptil, Habilidad, Afinidad — contratos compartidos
supabase/migrations/        # SQL versionado: esquema + RLS + grants
scripts/                    # seed.ts, check-taxonomy.ts, fix-grants.sql
```

Los componentes de React **nunca** calculan balance: solo leen del motor (`lib/game-engine`) a través de `useEngineData()`/`useRoster()` o llamando directamente a las funciones puras. El modo Jugar reutiliza exactamente ese mismo motor de daño, así que el resultado de un ataque en `/jugar` es matemáticamente idéntico al que calcularía `/simulador`.

## Motor de balance

Todas las fórmulas están centralizadas en `lib/game-engine/` y ninguna usa números mágicos: siempre reciben un `EngineConfig` (por defecto `DEFAULT_ENGINE_CONFIG`, o el valor vigente en `/configuracion`).

- **BST** = HP + ATK + DEF + SPD + INST + ADP (estándar: 360)
- **Índice Ofensivo** = ATK×1.10 + SPD×0.65 + INST×0.40 + ADP×0.25
- **Índice Defensivo** = HP×0.55 + DEF×1.15 + ADP×0.35
- **Índice de Movilidad** = SPD×1.25 + INST×0.45
- **Daño** = Potencia × ((ATK + offset) / (DEF + offset)) × MultAfinidad × STAB ÷ divisor
- **Matchup**: probabilidad de victoria = poder de combate propio ÷ (poder propio + poder rival), donde el poder de combate es el Índice Ofensivo amplificado por el multiplicador de afinidad y dividido por el Índice Defensivo rival — así ningún arquetipo (glass cannon o tanque) domina estructuralmente el ranking.
- **Auditoría**: BST fuera de estándar, estadística > 90 (alerta de pico) o < 20 (sacrificio extremo), y Win Rate > 55 % (dominante) o < 45 % (débil) marcan al personaje como `REVISAR` o `RIESGO_ALTO`.
- **Terminología**: `lib/game-engine/stat-labels.ts` centraliza el nombre largo de cada estadística (Ataque, Defensa, Velocidad...) para no confundir con las siglas ATK/DEF en la interfaz.

## Sistema de afinidades

8 afinidades en una topología cíclica cerrada (Térmico → Acuático → Venenoso → Acorazado → Ágil → Camuflaje → Sensorial → Constrictor → Térmico...): cada una vence a las 2 siguientes, pierde con las 2 anteriores y es neutral con las 4 restantes (incluyéndose a sí misma). `/afinidades` audita automáticamente el cierre de la matriz y muestra 🚨 si alguien la desbalancea.

## Panel de administración (`/admin`)

Protegido por una contraseña compartida (`ADMIN_PASSWORD`, cookie firmada con HMAC — ver `lib/auth/admin-session.ts`). Permite:

- **`/admin/reptiles`**: crear, editar (con auditoría BST/índices en vivo, igual que `/nuevo-personaje`), **desactivar** (soft-delete: `activo=false`, desaparece del roster público sin perder el historial) o **eliminar** definitivamente (borra también sus habilidades por `ON DELETE CASCADE`).
- **`/admin/habilidades`**: editar potencia/precisión/efecto de cualquier habilidad, o crear una nueva.

Todas las escrituras pasan por `src/app/api/admin/*` (Route Handlers) usando la clave `service_role`, nunca expuesta al navegador. Tras cualquier cambio, `useRosterStore.refetch()` invalida la caché para que el resto de la app (roster, ranking, dashboard...) refleje el cambio sin recargar.

## Modo Jugar (`/jugar`)

Juego de cartas por turnos, 2 jugadores, mazos de hasta 5 reptiles elegidos libremente:

1. **Lobby** (`/jugar`): cada jugador arma su mazo con `DeckBuilder`.
2. **Mesa** (`/jugar/mesa`): fase de invocación (cada jugador saca su primer reptil), luego fase de combate — el jugador en turno ataca con una de las 4 habilidades de su reptil activo. El daño se calcula con `calculateDamage()`, el mismo motor que `/simulador`.
3. Multijugador **local (pasar y jugar)**: entre turnos aparece una pantalla "pasa el dispositivo" para privacidad. Las animaciones (invocación, impacto, "¡Súper efectivo!", victoria) usan `framer-motion`.
4. **Preparado para online**: `lib/card-game/engine.ts` es un reducer puro `(state, action) => state`, y las tablas `game_rooms`/`game_players`/`game_moves` ya existen en Supabase (creadas, sin políticas públicas todavía). Activar el online más adelante es cambiar la capa de transporte (Supabase Realtime), no las reglas del juego.

## Cómo añadir o editar reptiles/habilidades

Desde `/admin` (recomendado, persiste en Supabase de inmediato) o directamente en la base de datos. `src/data/reptiles.ts`/`abilities.ts` ya no son la fuente de verdad en runtime — quedan como fixture de semilla para `scripts/seed.ts` y para los tests de Vitest (que validan el motor puro sin depender de red).

## Cómo cambiar multiplicadores

Desde `/configuracion` (persistido en el navegador vía Zustand), o cambiando `DEFAULT_ENGINE_CONFIG` en `src/lib/game-engine/config.ts` para modificar el valor de fábrica.

## Cómo configurar imágenes

`src/lib/services/images.ts` busca en orden: Wikipedia REST API → Wikimedia Commons → iNaturalist; si todas fallan usa `/public/reptile-fallback.svg`. `buscarImagenesReptil()` trae varias fotos (también con GBIF) para la galería de la ficha de personaje. `src/lib/services/taxonomy.ts` + `scripts/check-taxonomy.ts` cruzan cada especie contra el backbone taxonómico de GBIF y reportan discrepancias (nunca sobreescriben datos automáticamente). Las URLs base de todas estas APIs se pueden redirigir vía `.env` sin tocar código.

## Stack

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth de API keys) · Recharts · TanStack Table · React Hook Form + Zod · Zustand · Framer Motion · Lucide React · cmdk (Ctrl+K).

## Despliegue en Vercel

`npm run build` está verificado (TypeScript sin errores, ESLint sin errores). Conecta el repositorio en Vercel y agrega las variables de entorno de `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`) en la configuración del proyecto en Vercel — sin ellas, el sitio no puede leer el roster.
