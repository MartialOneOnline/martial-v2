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
| Prototipo V2 (aistudio) | martialapp.online | ✅ Live en Hostinger |
| Web V2 (Next.js real) | martialapp.online | 🔧 Pendiente deploy (reemplazará el prototipo) |
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

### Sesión 7 — completada ✅
- Figma MCP conectado y funcionando (Pro plan, sin rate limits)
- Analizados los 3 archivos Figma completos:
  - `wLZEV2ENEGFDvNQNv2L532` — Web Landing Page (1 frame grande 1776×8812px)
  - `CnmTRNGObXJeKJiXBagsPj` — School Portal / Dashboard owner
  - `sSrSP43cOvx4d0MA1NKg8U` — Martial App Mobile (~60 pantallas: auth, explore, profile, booking, ranking...)
- Design system extraído del mobile:
  - Primary: #006197 · Primary mid: #3d86af · Background: #fafafa
  - Title: #061229 · Subtitle: #333333 · Details: #4f4f4f
  - Fuente: EnnVisions Regular/Medium (comercial — pendiente decisión)
- Aprendido flujo Figma Dev Mode → URL con node-id → get_design_context
- Pendiente: entrar dentro del frame 1:27 (landing) y extraer secciones individuales
- Nota: frames grandes (>5000px) dan timeout en get_design_context — usar node-id de subsecciones

### Sesión 8 — completada ✅
- Tailwind CSS v4.3.0 instalado en apps/web
- postcss.config.mjs creado con @tailwindcss/postcss
- globals.css actualizado con @import "tailwindcss" + design tokens @theme
- layout.tsx actualizado — Inter (Google Font), metadata en inglés
- Landing page completa implementada en app/page.tsx:
  - Navbar sticky · Hero · Free Platform bar · Dashboard mock
  - Blue CTA · For Members/Academies · Featured Schools
  - Stats · Disciplines · Mobile App · Testimonials
  - Search CTA · Payment Methods · App Download · Footer
- Build limpio ✅ · localhost:3000 respondiendo 200 OK
- Pendiente: imágenes reales (ahora son placeholders azules)
- Nota: frame 1:27 es demasiado grande para get_design_context — necesita node-ids de subsecciones

### Sesión 9 — completada ✅ (prototipo aistudio)
- Prototipo visual completo desplegado en martialapp.online (Hostinger)
- Stack: Vite 6.4.2 + React 19 + TypeScript + Tailwind v4 + Framer Motion + Lucide React
- Proyecto local: /Users/pablocabo/Downloads/martial-app-aistudio/
- Deploy: build → dist/ → zip → Hostinger public_html/ → Extract

**Páginas implementadas en el prototipo:**

| Página | Componente | Estado |
|---|---|---|
| Homepage | HeroSection + FeaturedSchools + PartnersSection + AppDownloadBanner + ... | ✅ |
| Login popup | LoginModal.tsx | ✅ |
| Login página | LoginPage.tsx | ✅ |
| Register página | RegisterPage.tsx | ✅ |
| Explore | ExploreDatabase.tsx | ✅ |
| Academy | MartialOnlineLanding.tsx | ✅ |
| Dashboard (owner) | MartialOnlineDashboard.tsx | ✅ |
| Technology | AppDownloadBanner.tsx + FeaturesCloud.tsx | ✅ |
| School public page | SchoolPublicPage.tsx | ✅ |

**Funcionalidades del prototipo:**
- LoginModal estilo NZZL: SSO (Google, Facebook, Apple) + Email + link a Register
- RegisterPage con selector de rol: STUDENT / SCHOOL (campos distintos por rol)
- SPA router con ViewType: `home | explore | school-detail | academy | academy-dashboard | login | register`
- Selector de idioma: EN / ES / PT / FR (todas las secciones traducidas)
- Hero slider con 3 slides y overlay de stats
- ExploreDatabase con búsqueda por nombre/disciplina/ciudad + mapa visual
- Academy con cursos, filtros por categoría, Patreon tiers, wallet simulado
- Dashboard con sidebar, stats, creación de cursos, feed de comentarios

**Fotos reales usadas (en public/):**

| Archivo | Usado en |
|---|---|
| hero-1.jpg | Hero slide 1 |
| hero-2.jpg | Hero slide 2 |
| roger-gracie-dubai.jpg | Hero slide 3 |
| app-promo.jpg | AppDownloadBanner |
| roger-gracie-malaga.jpg | FeaturedSchools + ExploreDatabase + academyData |
| rafael-pousada-jiu-jitsu.jpg | FeaturedSchools + ExploreDatabase |
| carlson-peniche.png | FeaturedSchools + ExploreDatabase |
| mathouse.jpg | FeaturedSchools + ExploreDatabase + academyData |
| five-elements-jiu-jitsu.jpg | ExploreDatabase + academyData |
| sanlucar-jiu-jitsu.jpg | ExploreDatabase |
| centro-karate-mangualde.jpg | ExploreDatabase |
| martial-logo.png | Header, Footer, LoginModal, LoginPage, RegisterPage, MissionSection |

**Logos de equipos (en public/) — PartnersSection:**
- logo-gracie-barra.png · logo-roger-gracie.png · logo-alliance.png
- logo-carlson-gracie.png · logo-renzo-gracie.png · logo-gracie-humaita.png
- logo-leogalati.png · logo-nova-uniao.png · logo-yogui-bjj-spain.png

**Escuelas reales en el prototipo:**

| Escuela | Ciudad | Aparece en |
|---|---|---|
| Roger Gracie Malaga | Málaga, España | FeaturedSchools + Explore |
| Rafael Pousada Jiu-Jitsu | Jerez de la Frontera, España | FeaturedSchools + Explore |
| Carlson Gracie Jiu-Jitsu Peniche | Peniche, Portugal | FeaturedSchools + Explore |
| Mathouse BJJ Reading | Reading, UK | FeaturedSchools + Explore |
| Five Elements Jiu-Jitsu Huelva | Huelva, España | Explore |
| Jiu-Jitsu Brasileño Sanlucar | Sanlúcar de Barrameda, España | Explore |
| Roger Gracie Dubai Academy | Dubai, UAE | Explore |
| Centro de Karaté de Mangualde | Mangualde, Portugal | Explore |

**Próximo paso del prototipo:** sirve como referencia visual para implementar `apps/web`.

---

### Fase 2 — próxima (apps/web Next.js real)
- Implementar páginas con diseño del prototipo: /explore, /academy, /dashboard
- Login/Register con diseño real del prototipo + Supabase Auth ya conectado
- CRUD de escuelas: crear, listar, editar
- Roles y permisos reales (student / school / instructor / business)
- Imágenes reales ya disponibles en el prototipo — reutilizar en apps/web/public/

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

### 2026-05-29 — Sesión 7
**Hecho:** Figma MCP configurado · 3 archivos de diseño analizados · design system extraído · flujo Dev Mode aprendido  
**Funciona:** Figma MCP con Pro plan · get_design_context para nodos individuales  
**Notas:** frames grandes (>5000px altura) dan timeout — siempre usar node-id de sección específica · fuente EnnVisions es comercial · landing en 1 frame gigante 1:27 hay que explorar por subsecciones

### 2026-05-29 / 2026-05-30 — Sesión 9 (prototipo aistudio)
**Hecho:**
- Prototipo visual completo en /Users/pablocabo/Downloads/martial-app-aistudio/
- Todas las páginas del flujo implementadas: homepage · login popup · login · register · explore · academy · dashboard · technology
- LoginModal estilo NZZL con SSO (Google, Facebook, Apple) + Email
- RegisterPage con selector de rol STUDENT / SCHOOL
- Selector de idioma EN/ES/PT/FR en todas las secciones
- Todas las fotos Unsplash reemplazadas por fotos reales de academias
- 9 logos reales de equipos BJJ en PartnersSection
- Deploy funcionando en martialapp.online (Hostinger: build → zip → upload → extract)
**Funciona:** martialapp.online live con datos y fotos reales  
**Notas:** el prototipo es la referencia visual para implementar apps/web · las fotos y logos están en public/ del proyecto aistudio · deploy manual vía zip en Hostinger · caché del navegador: Cmd+Shift+R para ver cambios

---

## Referencias

- Supabase dashboard: https://supabase.com/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- Railway dashboard: https://railway.app/dashboard
- GitHub repo: https://github.com/MartialOneOnline/martial-v2
- Documentos de planificación: carpeta /docs del repo (pendiente subir)
