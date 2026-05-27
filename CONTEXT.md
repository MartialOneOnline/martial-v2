# CONTEXT — Martial App V2

> Este archivo es la memoria del proyecto.
> Actualízalo al INICIO y al FINAL de cada sesión de trabajo.
> Pégalo completo al inicio de cualquier conversación con IA.

---

## Proyecto

**Nombre:** Martial App V2
**Repo:** https://github.com/MartialOneOnline/martial-v2
**Rama principal:** main
**Proyecto local:** /Users/pablocabo/Projects/martial-v2
**Estado:** Fase 1 · Sesión 2 completada — monorepo base funcionando

---

## Dominios

| Entorno | Dominio | Estado |
|---|---|---|
| Producción actual (Laravel) | martialapp.com | ✅ No tocar |
| Explore actual | martialapp.com/explore | ✅ No tocar |
| Academy actual | academy.martialapp.com | ✅ No tocar |
| Web V2 | martialapp.online | 🔧 Pendiente deploy |
| Dashboard V2 | app.martialapp.online | 🔧 Pendiente deploy |
| API V2 | api.martialapp.online | 🔧 Pendiente deploy |

---

## Stack decidido

| Capa | Tecnología | Estado |
|---|---|---|
| Web / Admin / Explore | Next.js App Router (v16.2.0) | ✅ Arrancando |
| Mobile | Expo SDK 56 + React Native 0.85.3 | ✅ Arrancando |
| API | Node.js + Express + TypeScript | ✅ Arrancando |
| ORM | Prisma | ⏳ Sesión 3 |
| Base de datos | PostgreSQL — Supabase | ⏳ Sesión 3 |
| Auth | Supabase Auth (web + mobile + API) | ⏳ Sesión 4 |
| Estilos web | Tailwind CSS + Shadcn/ui | ⏳ Fase 2 |
| Estilos mobile | NativeWind | ⏳ Fase 3 |
| Monorepo | Turborepo | ✅ Configurado |
| Emails | Resend | ⏳ Fase futura |
| Pagos | Stripe — solo modo test, no antes de Fase 5 | ⏳ Fase 5 |
| Imágenes | Cloudinary | ⏳ Fase futura |
| Hosting web | Vercel | ⏳ Sesión 4 |
| Hosting API | Railway o Render | ⏳ Sesión 4 |
| Repo | GitHub — MartialOneOnline/martial-v2 | ✅ Activo |

---

## Estructura actual del monorepo

```
martial-v2/
├── apps/
│   ├── web/        ✅ Next.js 16.2.0 — localhost:3000
│   ├── api/        ✅ Node.js + Express — localhost:4000
│   └── mobile/     ✅ Expo SDK 56 — localhost:8081 / QR Expo Go
├── packages/
│   ├── ui/                 ✅ existe — limpiar en Fase 2
│   ├── eslint-config/      ✅ existe
│   └── typescript-config/  ✅ existe
├── CONTEXT.md      ✅
├── .env.example    ✅
├── turbo.json      ✅
└── package.json    ✅
```

**Pendiente añadir (fases futuras):**
```
├── packages/
│   ├── types/       ← tipos TypeScript compartidos
│   └── validators/  ← Zod schemas compartidos
└── prisma/          ← schema y migraciones (Sesión 3)
```

---

## Lo que funciona ahora mismo

```bash
npm run dev
```

Arranca los tres servicios en paralelo con Turborepo:

| Servicio | URL | Estado |
|---|---|---|
| apps/web | http://localhost:3000 | ✅ Responde |
| apps/api | http://localhost:4000 | ✅ Responde |
| apps/api /health | http://localhost:4000/health | ✅ { status: "ok" } |
| apps/mobile | http://localhost:8081 | ✅ Metro Bundler |
| apps/mobile | exp://192.168.1.44:8081 | ✅ QR Expo Go |

**Nota sobre Ctrl+C:** aparece `npm error code 130` al parar los procesos. Es el comportamiento normal al interrumpir servidores dev manualmente — no es un bug.

**Nota sobre vulnerabilidades npm:** hay avisos pero no hemos ejecutado `npm audit fix` para evitar romper versiones. Se revisará cuando el proyecto esté más estable.

---

## Commits actuales

```
78e8a35  Initial commit from create-turbo
0017f87  docs: add project context and env example
019e68b  chore: replace docs with api and mobile apps
dc14389  chore: add dev script to mobile app
```

---

## Estado por sesiones

### Sesión 1 — completada ✅
- Entorno local preparado (Node, npm, Git)
- Repo GitHub creado (MartialOneOnline/martial-v2, privado)
- Monorepo Turborepo creado
- Push inicial a main
- CONTEXT.md creado
- .env.example creado

### Sesión 2 — completada ✅
- apps/docs eliminado (era ejemplo de Turborepo)
- apps/api creado con Node.js + Express + TypeScript
- apps/api responde en localhost:4000
- apps/api tiene endpoint /health funcionando
- apps/mobile creado con Expo SDK 56
- apps/mobile arranca Metro Bundler
- npm run dev arranca los tres servicios en paralelo

### Sesión 3 — próxima ⏳
- Crear proyecto en Supabase
- Configurar variables de entorno locales (.env)
- Instalar Prisma en apps/api
- Crear schema inicial: User + School
- Ejecutar primera migración o db push
- Verificar conexión con Supabase

### Sesión 4 — pendiente ⏳
- Configurar Supabase Auth en apps/web
- Crear página de login básica
- Crear página de register básica
- Crear dashboard vacío protegido por auth
- Deploy inicial en Vercel

---

## Decisiones confirmadas

1. **Supabase Auth** como sistema único para web, mobile y API.
2. **Monorepo con Turborepo** — todo en un solo repo.
3. **PostgreSQL en Supabase** como base de datos.
4. **Prisma** como ORM — schema como fuente de verdad.
5. **Next.js App Router** para web, dashboard y Explore.
6. **Expo / React Native** para app móvil real — no WebView.
7. **Node.js + Express** para la API común.
8. **Stripe solo en modo test** y no antes de Fase 5.
9. **Academy separada** — no fusionar hasta Fase 7.
10. **martialapp.com (Laravel) no se toca** — solo referencia funcional.
11. **API primero** — ningún frontend sin endpoint correspondiente.
12. **apps/mobile existe desde Fase 1** con Expo instalado, sin pantallas reales todavía.

---

## Reglas de trabajo

- Un módulo a la vez. No pasar al siguiente hasta que el actual funciona.
- Commits pequeños y frecuentes. Cada cambio que funciona, a GitHub.
- No usar `git add .` si solo queremos subir archivos concretos.
- Si no entiendo el código que generó la IA, no lo despliego.
- El schema de Prisma no se cambia sin pensarlo bien.
- No mezclar Academy con la app principal todavía.
- No construir pagos ni memberships en fases iniciales.
- No migrar datos reales todavía.
- Mantener este archivo actualizado al inicio y al final de cada sesión.

---

## Lo que NO se construye todavía

- Pagos reales / Stripe webhooks
- Memberships y trials
- GoCardless / Redsys
- Módulo de Academy
- Login unificado con Academy
- Reports avanzados
- Notificaciones push / SMS
- Migración de datos reales de Laravel
- Cualquier cambio en martialapp.com — no tocar

---

## Historial de sesiones

### 2026-05-27 — Sesión 1
**Hecho:** entorno local · repo GitHub · monorepo Turborepo · CONTEXT.md · .env.example · push inicial
**Funciona:** web localhost:3000 · Turborepo arranca
**Notas:** Turborepo creó apps/docs por defecto — se eliminó en Sesión 2

### 2026-05-27 — Sesión 2
**Hecho:** eliminado apps/docs · creado apps/api con Express + /health · creado apps/mobile con Expo SDK 56 · npm run dev arranca los tres servicios
**Funciona:** web 3000 · api 4000 · api/health · mobile 8081 · QR Expo Go
**Notas:** error code 130 al Ctrl+C es normal · vulnerabilidades npm no resueltas intencionalmente

### 2026-05-27 — Sesión 3 (esta sesión)
**Hecho:** actualizado CONTEXT.md con estado real
**Próximo paso:** Supabase + Prisma

---

## Referencias

- Supabase dashboard: https://supabase.com/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- Railway dashboard: https://railway.app/dashboard
- GitHub repo: https://github.com/MartialOneOnline/martial-v2
- Documentos de planificación: carpeta /docs del repo (pendiente subir)
