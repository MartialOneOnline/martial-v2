# AGENTS.md — Martial App V2

Este repo se desarrolla con varios agentes de IA en paralelo (Claude Code y Codex). Este archivo da el contexto mínimo para que cualquier agente pueda operar con seguridad. **Antes de nada, lee [`CONTEXT.md`](./CONTEXT.md)** — es la memoria completa del proyecto (stack, dominios, arquitectura, estado de cada módulo) y se actualiza al final de cada sesión.

## Qué es esto

Monorepo Turborepo. Next.js 16 (`apps/web`) es la app principal — dashboard multi-tenant para escuelas de artes marciales (membresías, clases, eventos, pagos Stripe). Prisma 7 + PostgreSQL (Supabase). Sustituye gradualmente una app Laravel V1 en producción (`martialapp.com` — no tocar).

```
apps/web        Next.js 16 + Tailwind v4 — dashboard, portal /my, marketing
apps/api        Node.js + Express + TS
apps/mobile     Expo SDK 56 + React Native
apps/prototype  Vite + React (landing legado)
packages/       ui, eslint-config, typescript-config, types
prisma/         schema.prisma + migrations
scripts/        importación V1, utilidades one-off
```

## Comandos

```
npm run dev          # turbo dev, todas las apps
npm run build        # turbo build
npm run lint          # turbo lint
npm run check-types   # turbo check-types
npm run db:seed       # prisma/seed.ts
```

## Reglas de trabajo en paralelo (varios agentes en el mismo repo)

- **No trabajar directamente sobre `main`.** Cada agente/feature usa su propia rama y, si es posible, su propio `git worktree` para no pisar archivos que otro agente tenga abiertos a la vez. Claude Code ya deja los suyos en `.claude/worktrees/<nombre>` sobre ramas `claude/*`.
- Antes de empezar, comprobar `git worktree list` y `git branch -a` para ver qué está en curso.
- Cambios que tocan `prisma/schema.prisma`: generar y commitear la carpeta de migración (`prisma/migrations/...`) en el mismo commit que el schema — es un fallo recurrente en este proyecto que el schema cambie sin que la migración llegue a git.
- `.env`, `.env.local` nunca se suben (están en `.gitignore`); usar `.env.example` como referencia de qué variables existen.
- No tocar nada bajo dominio `martialapp.com` / la app Laravel V1 — solo lectura para referencia de comportamiento a replicar.

## Convenciones de código

- TypeScript estricto, Tailwind v4 para estilos.
- Componentes de dashboard reutilizables en `apps/web/components/` (p.ej. `RowMenu.tsx` para menús "..." en tablas — usar ese, no reimplementar).
- Precios: usar `fmtPrice` de `apps/web/lib/format.ts`, no formatear moneda a mano.
- i18n: 4 idiomas (EN/ES/PT/FR) vía `LanguageContext` — cualquier texto nuevo de cara al usuario debe pasar por ahí.

## Al terminar una sesión

Actualiza `CONTEXT.md` con lo que cambió y el estado nuevo, igual que se hace tras cada sesión con Claude Code.
