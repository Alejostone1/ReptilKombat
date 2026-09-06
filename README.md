# 🦎 REPTILES RPG — Game Balance System

Herramienta profesional de **Game Design, Character Management, Combat Analysis y Balance Analytics** para un videojuego móvil de criaturas basado en reptiles reales, con un sistema estratégico de afinidades tipo piedra-papel-tijera (pero cerrado en 8 tipos, sin dominancia estructural).

40 reptiles reales · 8 afinidades balanceadas (2 ventajas / 2 desventajas / 4 neutrales cada una) · 160 habilidades · matriz de matchups 40×40 · motor de daño y balance centralizado · imágenes reales vía Wikipedia/Wikimedia.

## Instalación

```bash
git clone TU_REPOSITORIO
cd reptiles-rpg
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Producción

```bash
npm run build
npm start
```

## Tests

```bash
npm run test
```

Valida automáticamente: el cierre de la matriz de afinidades (2/2/4 por tipo), BST = 360 en todo el roster, matchup en espejo = 50/50, y la detección de personajes dominantes/débiles.

## Arquitectura

```
src/
  app/                    # Rutas (Next.js App Router): dashboard, roster, reptiles/[id],
                          # comparador, simulador, matchups, ranking, afinidades,
                          # habilidades, auditoria, nuevo-personaje, familias, configuracion
  components/
    layout/               # Sidebar, AppShell, GlobalSearch (Ctrl+K)
    dashboard/            # KpiCard, RankedList
    reptiles/             # ReptileCard, ReptileTable, ReptileSelector, ReptileImage, StatBar
    combat/               # MatchupCard, MatchupHeatmap, DamageResultPanel
    charts/               # StatRadar, AffinityRadarChart, StatsByAffinityChart, etc. (Recharts)
    affinities/            # AffinityBadge, AffinityMatrixGrid
    abilities/            # AbilityCard
    ui/                   # Primitivas: Card, Badge, Button, Input, Tabs, Tooltip...
  lib/
    game-engine/          # ÚNICA fuente de verdad para toda fórmula de balance
      config.ts           # EngineConfig (multiplicadores, umbrales) — nada hardcodeado
      stats.ts            # BST, índices ofensivo/defensivo/movilidad
      affinities.ts       # Tier de matchup, multiplicador, auditoría de la matriz
      damage.ts           # Motor de daño
      matchups.ts         # Motor de matchups, win rate, mejores/peores counters
      balance.ts          # Auditoría de personajes y salud del meta
    services/images.ts    # Búsqueda de fotografías reales (Wikipedia/Wikimedia Commons)
    store/config-store.ts # Zustand: configuración del motor persistida en localStorage
    hooks/useEngineData.ts# Punto único de acceso a roster + matriz + auditoría reactivos
  data/                   # Roster, habilidades, matriz y familias (datos base, sin cálculos)
  types/                  # Reptil, Habilidad, Afinidad — contratos compartidos
```

Los componentes de React **nunca** calculan balance: solo leen del motor (`lib/game-engine`) a través de `useEngineData()` o llamando directamente a las funciones puras. Esto permite reutilizar el motor en un futuro backend, IA de balance automático o PvP sin reescribir nada.

## Motor de balance

Todas las fórmulas están centralizadas en `lib/game-engine/` y ninguna usa números mágicos: siempre reciben un `EngineConfig` (por defecto `DEFAULT_ENGINE_CONFIG`, o el valor vigente en `/configuracion`, persistido vía Zustand).

- **BST** = HP + ATK + DEF + SPD + INST + ADP (estándar: 360)
- **Índice Ofensivo** = ATK×1.10 + SPD×0.65 + INST×0.40 + ADP×0.25
- **Índice Defensivo** = HP×0.55 + DEF×1.15 + ADP×0.35
- **Índice de Movilidad** = SPD×1.25 + INST×0.45
- **Daño** = Potencia × ((ATK + offset) / (DEF + offset)) × MultAfinidad × STAB ÷ divisor
- **Matchup**: probabilidad de victoria = poder de combate propio ÷ (poder propio + poder rival), donde el poder de combate es el Índice Ofensivo amplificado por el multiplicador de afinidad y dividido por el Índice Defensivo rival — así ningún arquetipo (glass cannon o tanque) domina estructuralmente el ranking.
- **Auditoría**: BST fuera de estándar, estadística > 90 (alerta de pico) o < 20 (sacrificio extremo), y Win Rate > 55 % (dominante) o < 45 % (débil) marcan al personaje como `REVISAR` o `RIESGO_ALTO`.

## Sistema de afinidades

8 afinidades en una topología cíclica cerrada (Térmico → Acuático → Venenoso → Acorazado → Ágil → Camuflaje → Sensorial → Constrictor → Térmico...): cada una vence a las 2 siguientes, pierde con las 2 anteriores y es neutral con las 4 restantes (incluyéndose a sí misma). La matriz vive en `src/data/affinities.ts` como **tiers** (ventaja/neutral/desventaja), no como números — los multiplicadores reales siempre se resuelven contra la configuración vigente. `/afinidades` audita automáticamente el cierre de la matriz y muestra 🚨 si alguien la desbalancea.

## Cómo añadir reptiles

1. Agrega una entrada a `REPTILES_BASE` en `src/data/reptiles.ts` (mismo shape que las 40 existentes; `id` debe ser único).
2. Agrega sus 4 habilidades a `ABILITIES` en `src/data/abilities.ts` con `propietarioId` igual al `id` del reptil.
3. El motor calcula automáticamente BST, índices, matchups y auditoría — no hace falta tocar ningún componente.
4. Usa `/nuevo-personaje` para diseñar y auditar en vivo antes de copiar los valores finales a `reptiles.ts`.

## Cómo añadir habilidades

Agrega un objeto a `ABILITIES` (`src/data/abilities.ts`) con `categoria` en `"Fisica" | "Tecnica" | "Control" | "Estado"`. Aparece automáticamente en `/habilidades`, en la ficha del personaje y en `/simulador`.

## Cómo cambiar multiplicadores

Desde `/configuracion` (persistido en el navegador), o cambiando `DEFAULT_ENGINE_CONFIG` en `src/lib/game-engine/config.ts` para modificar el valor por defecto de fábrica.

## Cómo configurar imágenes

`src/lib/services/images.ts` busca primero por nombre científico en la Wikipedia REST API y, si falla, en Wikimedia Commons; si ambas fallan usa `/public/reptile-fallback.svg`. Las URLs base se pueden redirigir mediante `.env` (ver `.env.example`) sin tocar código. Los dominios de imágenes remotas están declarados en `next.config.ts` (`images.remotePatterns`).

## Cómo conectar Supabase (futuro)

Los datos viven hoy en `src/data/*.ts` como arrays tipados (`ReptilBase[]`, `Habilidad[]`) que calzan 1:1 con columnas de tabla. Para migrar:

1. Crear tablas `reptiles`, `habilidades`, `familias`, `configuracion` en Postgres con las mismas columnas que los tipos en `src/types/`.
2. Reemplazar los `import` de `src/data/*.ts` por llamadas a Supabase (`select()`) dentro de `src/data/roster.ts`, manteniendo la firma de `ROSTER`/`getReptilById` para no tocar ningún componente.
3. Mover `EngineConfig` de Zustand+localStorage a una tabla `configuracion` con Supabase Realtime si se necesita sincronizar entre dispositivos.

## Stack

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Recharts · TanStack Table · React Hook Form + Zod · Zustand · Lucide React · cmdk (Ctrl+K).

## Despliegue en Vercel

`npm run build` está verificado (TypeScript sin errores, ESLint sin errores). Conecta el repositorio en Vercel y despliega directamente — no requiere variables de entorno para funcionar (las de `.env.example` son opcionales, solo para redirigir las APIs de imágenes o conectar Supabase en el futuro).
