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
**Estado:** Fase 1 · COMPLETA ✅ — Flujo end-to-end funcionando: web → API → DB

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
| ORM | Prisma 7.8.0 | ✅ Configurado |
| Base de datos | PostgreSQL — Supabase | ✅ Conectada |
| Auth | Supabase Auth (web + mobile + API) | ⏳ Sesión 4 |
| Estilos web | Tailwind CSS + Shadcn/ui | ⏳ Fase 2 |
| Estilos mobile | NativeWind | ⏳ Fase 3 |
| Monorepo | Turborepo | ✅ Configurado |
| Emails | Resend | ⏳ Fase futura |
| Pagos | Stripe — solo modo test, no antes de Fase 5 | ⏳ Fase 5 |
| Imágenes | Cloudinary | ⏳ Fase futura |
| Hosting web | Vercel | ⏳ Sesión futura |
| Hosting API | Railway o Render | ⏳ Sesión futura |
| Repo | GitHub — MartialOneOnline/martial-v2 | ✅ Activo |

---

## Estructura actual del monorepo

```txt
martial-v2/
├── apps/
│   ├── web/        ✅ Next.js 16.2.0 — localhost:3000
│   ├── api/        ✅ Node.js + Express — localhost:4000
│   └── mobile/     ✅ Expo SDK 56 — localhost:8081 / QR Expo Go
├── packages/
│   ├── ui/                 ✅ existe — limpiar en Fase 2
│   ├── eslint-config/      ✅ existe
│   └── typescript-config/  ✅ existe
├── prisma/
│   └── schema.prisma       ✅ User, School, Role
├── prisma.config.ts        ✅ Prisma 7 config usando DIRECT_URL
├── CONTEXT.md              ✅
├── .env.example            ✅
├── .env                    ✅ local, ignorado por Git
├── turbo.json              ✅
└── package.json            ✅
```

**Pendiente añadir (fases futuras):**
```txt
packages/
├── types/       ← tipos TypeScript compartidos
└── validators/  ← Zod schemas compartidos
```

**No se sube a GitHub:**
```txt
.env
generated/prisma/
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
| apps/api /health | http://localhost:4000/health | ✅ `{ status: "ok" }` |
| apps/api /db-test | http://localhost:4000/db-test | ✅ `{ status: "connected", users: 0, schools: 0 }` |
| apps/web /login | http://localhost:3000/login | ✅ Login con Supabase Auth |
| apps/web /register | http://localhost:3000/register | ✅ Registro con Supabase Auth |
| apps/web /dashboard | http://localhost:3000/dashboard | ✅ Protegido — redirige a /login sin sesión |
| apps/mobile | http://localhost:8081 | ✅ Metro Bundler |
| apps/mobile | exp://192.168.1.44:8081 | ✅ QR Expo Go |

**Nota sobre Ctrl+C:** aparece `npm error code 130` al parar los procesos. Es el comportamiento normal al interrumpir servidores dev manualmente — no es un bug.

**Nota sobre vulnerabilidades npm:** hay avisos pero no hemos ejecutado `npm audit fix` para evitar romper versiones. Se revisará cuando el proyecto esté más estable.

---

## Supabase

**Proyecto Supabase:** martial-v2  
**Project URL:** https://fixipigqxebxferfxlsv.supabase.co  
**Región:** West EU / Ireland  

Variables usadas localmente en `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SECRET_KEY="..."

DATABASE_URL="..."
DIRECT_URL="..."
```

Reglas:

- `NEXT_PUBLIC_SUPABASE_URL` puede exponerse.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` puede exponerse.
- `SUPABASE_SECRET_KEY` nunca se comparte.
- `DATABASE_URL` nunca se comparte.
- `DIRECT_URL` nunca se comparte.
- `.env` nunca se sube a GitHub.

**Prisma/Supabase:**

- `DATABASE_URL` se usa en runtime para queries normales de la API.
- `DIRECT_URL` se usa en `prisma.config.ts` para operaciones de schema como `db push`.
- Prisma 7 usa `prisma.config.ts` para la configuración de datasource.
- El cliente generado vive en `generated/prisma/` y está ignorado por Git.

---

## Prisma

**Versión:** Prisma 7.8.0

Archivos actuales:

```txt
prisma/schema.prisma
prisma.config.ts
apps/api/src/lib/prisma.ts
```

Modelos actuales:

```txt
User
School
Role
```

Tablas reales en Supabase:

```txt
users
schools
```

Decisiones Prisma:

- `prisma/schema.prisma` vive en la raíz del monorepo.
- Se usa `@@map("users")` y `@@map("schools")` para tablas lowercase.
- `User.supabaseAuthId` existe como puente futuro con Supabase Auth.
- `prisma.config.ts` usa `DIRECT_URL`.
- `apps/api/src/lib/prisma.ts` usa `@prisma/adapter-pg`, `pg` y `DATABASE_URL`.
- `generated/prisma/` no se commitea.

Endpoint temporal:

```txt
GET /db-test
```

Uso:

- Solo verifica conexión `API → Prisma → Supabase`.
- Debe eliminarse o protegerse en una sesión futura.

---

## Commits actuales

```txt
78e8a35  Initial commit from create-turbo
0017f87  docs: add project context and env example
019e68b  chore: replace docs with api and mobile apps
dc14389  chore: add dev script to mobile app
61a38ff  docs: update context after api and mobile setup
c636007  chore: update env example with Supabase and Prisma variables
e46f56c  feat: add Prisma schema connected to Supabase
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

### Sesión 3 — completada ✅
- Proyecto Supabase creado
- `.env` local creado y configurado
- `.env.example` actualizado con variables Supabase/Prisma
- Prisma 7.8.0 instalado
- `@prisma/client` instalado en apps/api
- `@prisma/adapter-pg` y `pg` instalados en apps/api
- `prisma.config.ts` creado usando `DIRECT_URL`
- `prisma/schema.prisma` creado con `User`, `School` y `Role`
- `npx prisma db push` ejecutado correctamente
- `npx prisma generate` ejecutado correctamente
- `apps/api/src/lib/prisma.ts` creado
- `/db-test` creado y probado correctamente
- Conexión `API → Prisma → Supabase PostgreSQL` verificada

### Sesión 4 — completada ✅
- Supabase Auth en apps/web
- Login con `signInWithPassword`
- Register con `signUp` + nombre de usuario
- `lib/supabase/client.ts` — cliente browser
- `lib/supabase/server.ts` — cliente servidor con cookies
- `middleware.ts` — protección de rutas, refresh de token automático
- `app/dashboard/page.tsx` — Server Component, lee usuario de Supabase
- `app/dashboard/LogoutButton.tsx` — Client Component, cierra sesión
- `app/page.tsx` — home limpia de Martial (fondo negro, links a login/register)
- `app/layout.tsx` — metadatos correctos, lang="es"
- Flujo completo verificado en navegador: login → dashboard → logout

### Sesión 5 — completada ✅
- `packages/types/` — tipos compartidos: User, School, Role, ApiResponse
- `apps/api/src/lib/supabase.ts` — cliente Supabase admin singleton
- `apps/api/src/middleware/auth.ts` — valida JWT de Supabase, devuelve 401 si falta o es inválido
- `apps/api/src/types/express.d.ts` — extiende Express Request con supabaseUser
- `GET /me` — endpoint protegido, upsert de usuario en DB en primera llamada
- Sin token → 401 MISSING_TOKEN ✅
- Token inválido → 401 INVALID_TOKEN ✅
- `apps/api/tsconfig.json` — eliminado rootDir para permitir import de Prisma desde raíz
- `apps/api/src/lib/prisma.ts` — corregida extensión .js en import ESM

### Sesión 6 — completada ✅
- Dashboard llama a `GET /me` con el JWT real de Supabase
- Primera llamada crea el usuario en la DB (upsert por supabaseAuthId)
- Dashboard muestra datos de la DB: id, email, nombre, rol, escuela, fecha
- `apps/web/.env.local` — añadido `API_URL=http://localhost:4000`
- Flujo end-to-end verificado en navegador: login → dashboard → datos de DB
- Nota: middleware.ts mantenido (proxy convention incompatible con @supabase/ssr en Next.js 16.2.0)

### Fase 2 — próxima
- Instalar Tailwind CSS + Shadcn/ui en apps/web
- Diseño real de la interfaz
- CRUD de escuelas: crear, listar, editar
- Roles y permisos reales

---

## Decisiones confirmadas

1. **Supabase Auth** como sistema único para web, mobile y API.
2. **Monorepo con Turborepo** — todo en un solo repo.
3. **PostgreSQL en Supabase** como base de datos.
4. **Prisma 7** como ORM.
5. **Next.js App Router** para web, dashboard y Explore.
6. **Expo / React Native** para app móvil real — no WebView.
7. **Node.js + Express** para la API común.
8. **Stripe solo en modo test** y no antes de Fase 5.
9. **Academy separada** — no fusionar hasta Fase 7.
10. **martialapp.com (Laravel) no se toca** — solo referencia funcional.
11. **API primero** — ningún frontend sin endpoint correspondiente.
12. **apps/mobile existe desde Fase 1** con Expo instalado, sin pantallas reales todavía.
13. **generated/prisma/** no se sube a GitHub.

---

## Reglas de trabajo

- Un módulo a la vez. No pasar al siguiente hasta que el actual funciona.
- Commits pequeños y frecuentes. Cada cambio que funciona, a GitHub.
- No usar `git add .` si solo queremos subir archivos concretos.
- Si no entiendo el código que generó la IA, no lo despliego.
-
 El schema de Prisma no se cambia sin pensarlo bien.
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
- Diseño final Martial
- Tailwind/Shadcn real
- NativeWind
- Deploy producción

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

### 2026-05-27 — Sesión 3
**Hecho:** Supabase creado · Prisma 7 configurado · User/School/Role schema · db push OK · prisma generate OK · endpoint /db-test OK  
**Funciona:** API → Prisma → Supabase PostgreSQL  
**Notas:** se resolvió un problema de `.env` por `DATABASE_URL` duplicada; `.env` no se sube a GitHub

### 2026-05-28 — Sesión 4
**Hecho:** middleware.ts · app/dashboard (page + LogoutButton) · home limpia · layout metadata  
**Funciona:** flujo completo login → dashboard → logout · /dashboard protegido (redirige sin sesión) · nombre del usuario leído de Supabase  
**Notas:** dashboard muestra "Bienvenido, Pablo" leyendo user_metadata.name de Supabase Auth

### 2026-05-28 — Sesión 6
**Hecho:** dashboard conectado a API · GET /me con JWT real · usuario creado en DB al primer login · ficha de usuario con datos de DB  
**Funciona:** flujo completo web → API → DB verificado · p.cabomedina@gmail.com sincronizado en tabla users  
**Notas:** API_URL faltaba en apps/web/.env.local · middleware.ts mantenido (proxy convention rompe con @supabase/ssr)

### 2026-05-28 — Sesión 5
**Hecho:** packages/types · auth middleware API · express.d.ts · GET /me con upsert · fix tsconfig rootDir · fix prisma.ts import ESM  
**Funciona:** GET /me sin token → 401 · GET /me token inválido → 401 · API completamente segura  
**Notas:** GET /me con token real de Supabase aún no probado desde web — pendiente Sesión 6

---

## Referencias

- Supabase dashboard: https://supabase.com/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- Railway dashboard: https://railway.app/dashboard
- GitHub repo: https://github.com/MartialOneOnline/martial-v2
- Documentos de planificación: carpeta /docs del repo (pendiente subir)
