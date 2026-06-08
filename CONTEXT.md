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
**Estado:** Sesión 19 completada ✅ — School public page conectada a DB real (clases, planes, instructores)

---

## URLs activas

| App | URL | Stack | Estado |
|---|---|---|---|
| Prototipo (landing) | `martialapp.online` | Vite + React (AI Studio) | ✅ Live en Hostinger |
| App real | `martial-v2-web.vercel.app` | Next.js 16 + Supabase | ✅ Live en Vercel |
| API | pendiente | Node.js + Express | ⏳ Local |

**Deploy automático:** cada push a `main` despliega automáticamente en Vercel.

---

## Dominios

| Entorno | Dominio | Estado |
|---|---|---|
| Producción actual (Laravel) | martialapp.com | ✅ No tocar |
| Prototipo visual | martialapp.online | ✅ Live Hostinger |
| Web V2 | martial-v2-web.vercel.app | ✅ Live Vercel |
| Dominio final V2 | martialapp.online (futuro) | ⏳ Pendiente |
| Dashboard V2 | app.martialapp.online | ⏳ Pendiente |
| API V2 | api.martialapp.online | ⏳ Pendiente |

---

## Stack decidido

| Capa | Tecnología | Estado |
|---|---|---|
| Web / Dashboard | Next.js 16 + Tailwind v4 | ✅ Funcionando |
| Mobile | Expo SDK 56 + React Native | ✅ Arrancando |
| API | Node.js + Express + TypeScript | ✅ Local |
| ORM | Prisma 7.8.0 | ✅ Configurado |
| Base de datos | PostgreSQL — Supabase | ✅ Conectada |
| Auth | Supabase Auth (email) | ✅ Funcionando |
| Auth SSO | Google / Apple / Facebook | ⏳ Pendiente configurar |
| Monorepo | Turborepo | ✅ Configurado |
| Hosting web | Vercel | ✅ Desplegado |
| Hosting API | Railway o Render | ⏳ Pendiente |
| Emails | Resend | ⏳ Fase futura |
| Pagos | Stripe — solo modo test, no antes de Fase 5 | ⏳ Fase 5 |
| Imágenes | Cloudinary | ⏳ Fase futura |
| Repo | GitHub — MartialOneOnline/martial-v2 | ✅ Activo |

---

## Estructura del monorepo

```txt
martial-v2/
├── apps/
│   ├── web/        ✅ Next.js 16 — martial-v2-web.vercel.app
│   ├── api/        ✅ Node.js + Express — localhost:4000
│   ├── mobile/     ✅ Expo SDK 56 — localhost:8081 / QR Expo Go
│   └── prototype/  ✅ Prototipo Vite+React — martialapp.online
├── packages/
│   ├── ui/                 ✅ existe
│   ├── eslint-config/      ✅ existe
│   └── typescript-config/  ✅ existe
├── prisma/
│   └── schema.prisma       ✅ User, School, Role
├── prisma.config.ts        ✅ Prisma 7
├── CONTEXT.md              ✅
├── .env.example            ✅
├── .env                    ✅ local, ignorado por Git
├── turbo.json              ✅
└── package.json            ✅
```

**No se sube a GitHub:**
```txt
.env
generated/prisma/
```

---

## Arquitectura de usuarios

**3 tipos de usuario:**
- **Practitioner** — alumnos / usuarios
- **Business** — escuelas (admin / manager / instructor)
- **Superadmin** — gestión interna Martial

**2 capas:**
- **Pública** — Homepage, Explore, School pages, Academy
- **Privada** — Dashboards (escuela y alumno)

---

## Páginas del dashboard implementadas

| Módulo | Ruta | Estado |
|---|---|---|
| Dashboard home | `/dashboard` | ✅ Live |
| Classes | `/dashboard/classes` | ✅ Live |
| Events | `/dashboard/classes/events` | ✅ Live |
| Calendar | `/dashboard/classes/calendar` | ✅ Live |
| Timetable | `/dashboard/classes/timetable` | ✅ Live |
| Memberships | `/dashboard/memberships` | ✅ Live |
| Users | `/dashboard/users` | ✅ Live |
| Payments / Transactions | `/dashboard/payments/transactions` | ✅ Live |
| Payments / Subscriptions | `/dashboard/payments/subscriptions` | ✅ Live |
| School / Leads | `/dashboard/school/leads` | ✅ Live |
| School / Store | `/dashboard/school/store` | ✅ Live |
| School / Curriculum | `/dashboard/school/curriculum` | ✅ Live |
| School / Affiliates | `/dashboard/school/affiliates` | ✅ Live |
| School / Staff | `/dashboard/school/staff` | ✅ Live |
| School / Waivers | `/dashboard/school/waivers` | ✅ Live |
| School / Gradings | `/dashboard/school/gradings` | ✅ Live |
| Reports / Bookings | `/dashboard/reports/bookings` | ✅ Live |
| Reports / Gradings | `/dashboard/reports/gradings` | ✅ Live |
| Reports / Payments | `/dashboard/reports/payments` | ✅ Live |
| Reports / Balance | `/dashboard/reports/balance` | ✅ Live |
| Reports / Absents | `/dashboard/reports/absents` | ✅ Live |
| Reports / Users | `/dashboard/reports/users` | ✅ Live |
| Settings | `/dashboard/settings` | ✅ Live |
| Notifications | `/dashboard/notifications` | ✅ Live |
| Subscription | `/dashboard/subscription` | ✅ Live |
| Support | `/dashboard/support` | ✅ Live |

**Navegación:** todos los links del sidebar están correctamente conectados en todos los clientes.

---

## Lo que funciona ahora mismo

```bash
npm run dev
```

| Servicio | URL | Estado |
|---|---|---|
| apps/web | http://localhost:3000 | ✅ Responde |
| apps/api | http://localhost:4000 | ✅ Responde |
| apps/api /health | http://localhost:4000/health | ✅ OK |
| apps/api /db-test | http://localhost:4000/db-test | ✅ Conectado |
| apps/web /login | http://localhost:3000/login | ✅ Diseño Figma + Supabase |
| apps/web /register | http://localhost:3000/register | ✅ Diseño Figma + Supabase |
| apps/web /dashboard | http://localhost:3000/dashboard | ✅ Protegido |
| apps/mobile | exp://localhost:8081 | ✅ Expo Go |

---

## Supabase

**Proyecto:** martial-v2  
**URL:** https://fixipigqxebxferfxlsv.supabase.co  
**Región:** West EU / Ireland  

Variables en `.env` local y en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SECRET_KEY="..."
DATABASE_URL="..."
DIRECT_URL="..."
NODE_ENV=production
API_URL=https://martialapp.online
```

Reglas:
- `SUPABASE_SECRET_KEY` — nunca se comparte
- `DATABASE_URL` — nunca se comparte
- `DIRECT_URL` — nunca se comparte
- `.env` — nunca se sube a GitHub

---

## Prisma

**Versión:** Prisma 7.8.0

Archivos:
```txt
prisma/schema.prisma
prisma.config.ts
apps/api/src/lib/prisma.ts
```

Modelos: `User`, `School`, `Discipline`, `SchoolDiscipline`, `Instructor`, `MembershipPlan`, `Review`, `Class`, `Booking`, `Membership`, `Camp`, `CampBooking`, `SchoolMember`, `SchoolClaim`, `Partner`
Tablas en Supabase: todas sincronizadas con `prisma db push`

---

## Próximos pasos

1. **School public page — diseño** — mejorar UI/UX de `/school/[slug]` (Figma o iteración directa)
2. **LoginModal** — popup en homepage con SSO + Email
3. **SSO OAuth** — configurar Google en Supabase
4. **Homepage** — ajustes finales diseño AI Studio → Next.js
5. **API deploy** — Railway o Render
6. **Dominio propio** — conectar app.martialapp.online a Vercel
7. **Conectar dashboard a datos reales** — reemplazar mocks por API calls
8. **Importar más escuelas** — usar seed-schools.xlsx + import-from-v1.mjs

---

## Historial de sesiones

### Sesión 1 — 2026-05-27 ✅
Entorno local · repo GitHub · monorepo Turborepo · CONTEXT.md · push inicial

### Sesión 2 — 2026-05-27 ✅
apps/api Express + /health · apps/mobile Expo SDK 56 · npm run dev paralelo

### Sesión 3 — 2026-05-27 ✅
Supabase creado · Prisma 7 · schema User/School/Role · db push · /db-test OK

### Sesión 4 — 2026-05-28 ✅
middleware.ts · dashboard protegido · login/register funcionales · flujo completo

### Sesión 5 — 2026-05-28 ✅
packages/types · auth middleware API · GET /me con upsert · API segura

### Sesión 6 — 2026-05-28 ✅
Dashboard conectado a API · GET /me con JWT real · usuario en DB al primer login

### Sesión 7 — 2026-05-29 ✅
Figma MCP configurado · 3 archivos diseño analizados · design system extraído

### Sesión 8 — 2026-05-29 ✅
Tailwind v4 en apps/web · landing page completa con placeholders

### Sesión 9 — 2026-05-30 ✅
Prototipo aistudio mejorado: logos reales, fotos reales (escuelas), LoginModal,
LoginPage, RegisterPage (STUDENT/SCHOOL), partner logos · desplegado en martialapp.online
Prototipo movido a apps/prototype/ en el monorepo

### Sesión 10 — 2026-05-30 ✅
- Login/Register con diseño Figma implementado en apps/web
- Deploy a Vercel configurado y funcionando (martial-v2-web.vercel.app)
- Deploy automático en cada push a main
- Hosting cambiado de Hostinger a Vercel
- output: standalone eliminado de next.config.js (no necesario en Vercel)
- CONTEXT.md actualizado completo

### Sesión 11 — 2026-06-03 ✅
- Dashboard móvil reordenado: "Acción primero" (Academy Info → AI → KPIs → Classes → Quick Stats → Bookings → Transactions)
- AI Suggested Actions añadido a móvil (antes solo en panel desktop)
- CTAs del AI: de texto plano a píldoras tapeables con fondo indigo (#EEF2FF)
- Día activo Upcoming Classes: calculado dinámicamente desde `new Date()` (bug fix)
- Botones Academy Info actualizados: Invite / Send / QR code / Edit (icon-only con title para accesibilidad)
- KPI cards rediseñados: label top-left, badge de trend top-right, número grande, sub text abajo
- Labels KPI acortados para evitar wrapping en grid 2 columnas móvil
- Commit: 251dc85

### Sesión 12 — 2026-06-03 ✅
- **Classes page** (`/dashboard/classes`): tabla con stats, filtros All/Active/Full/Inactive, búsqueda, paginación, drawer "Create Class" con banner upload + legal checkboxes + success modal
- **Timetable page** (`/dashboard/classes/timetable`): vista calendario (weekly, 6–22h, class blocks clicables con popup de acciones) + vista lista con paginación y stats
- Timetable drawer "Add Timetable": banner upload drag-and-drop, toggles de días funcionales (Mon–Fri on, Sat–Sun off), inputs de tiempo deshabilitados en días inactivos, success modal al confirmar
- Filtro por location en la vista calendario (All / Main Academy / Branch Malaga)
- Color coding por actividad (BJJ, NOGI, Wrestling, Kids BJJ, Yoga, Open Mat, Competition)
- Commits: b8b9623, c3bbe37

### Sesión 13 — 2026-06-04 ✅
**Timetable — correcciones completas:**
- TODAY fijado dinámicamente · todayIdx dinámico · indicador hora actual (línea roja)
- Auto-scroll al montar en 10:30 AM
- TIMETABLE_LIST corregida: fechas únicas reales, campos days/time/instructor
- Lista view: columnas rediseñadas, búsqueda + filtro por actividad + empty state
- Drawer: campo Activity y Capacity añadidos; form se resetea al reabrir

**Calendar page** (`/dashboard/classes/calendar`):
- Vista Mes (default) + Vista Semana · Date Picker popover · Filtro por location
- Drawer "Add Class to Calendar" + success modal
- Commit: 77b63fc

**Events page** (`/dashboard/classes/events`):
- 12 eventos mock · Stats · Filtros · Búsqueda · Tabla completa · Create Event drawer
- Commit: bc79fb1

### Sesión 14 — 2026-06-04 ✅
**Memberships page** (`/dashboard/memberships`):
- KPI stat cards estilo Stripe+NZZL · 3 tabs underline · Filter chips · Tabla completa
- Create Membership drawer: dos columnas, class chips, Training Access cards
- Commits: 4b03c76, a8e34c1

### Sesión 15 — 2026-06-04 ✅
- **Settings page** (`/dashboard/settings`): 7 tabs — Profile, School, Staff, Payments, Grading, Password, Delete Account
- **Nav fix**: Settings correctamente enlazado en los 22 clientes del dashboard
- **Reports**: 6 páginas con charts (Bookings, Gradings, Payments, Balance, Absents, Users)
- **Payments**: Transactions + Subscriptions con drawers de entrada manual
- **School section**: 7 páginas (Leads, Store, Curriculum, Affiliates, Staff, Waivers, Gradings)
- **Users page**: tabla completa estilo NZZL

### Sesión 19 — 2026-06-08 ✅
- **School public page** (`/school/[slug]`): server component con datos reales de DB
- Clases con horario real de V1 (timetable.csv parseado)
- 11 membership plans insertados (2 privados con isActive=false)
- Instructores Pablo Cabo (4th degree) + Jose Luis Montiel (1st degree)
- Prisma client generado dentro de `apps/web/lib/prisma-client`
- DATABASE_URL configurado en `apps/web/.env.local`
- Commits: 0c0b446, 13916b9

### Sesión 18 — 2026-06-08 ✅
- **DB Strategy Review** — documento revisado, decisión confirmada: V1 solo como fuente de migración
- **Schema expandido**: `SchoolMember` + `SchoolClaim` + enums `SchoolMemberRole`, `SchoolMemberStatus`, `ClaimStatus`
- **prisma db push** — schema sincronizado con Supabase (nueva contraseña configurada)
- **seed.ts** — Roger Gracie Málaga insertado con datos reales de V1: coords, email, web, Instagram, teléfono, disciplinas (BJJ + Grappling), 9 facilities, instructores Pablo Cabo (4th degree) + Jose Luis Montiel (1st degree)
- **`scripts/seed-schools.xlsx`** — Excel con 3 pestañas (Schools, Instructors, Disciplines) para futuros imports
- **`GET /api/schools`** — API route Next.js con filtros q, city, discipline
- **Explore** — conectado a DB real, Roger Gracie Málaga aparece primero con datos reales
- Commit: 7c0af22

### Sesión 16 — 2026-06-05 ✅
- **Notifications page** (`/dashboard/notifications`): preferencias y listado
- **Subscription page** (`/dashboard/subscription`): plan activo, billing
- **Support page** (`/dashboard/support`): tickets y contacto
- **Nav fix School**: los 7 links de School section apuntaban a `#` en 9 clientes → corregidos a `/dashboard/school/*`
- turbo.json: añadido `dist/**` a build outputs
- Commits: c5c01f6, eb69ad9

---

## Decisiones confirmadas

1. **Supabase Auth** como sistema único para web, mobile y API
2. **Monorepo con Turborepo** — todo en un solo repo
3. **PostgreSQL en Supabase** como base de datos
4. **Prisma 7** como ORM
5. **Next.js App Router** para web, dashboard y Explore
6. **Expo / React Native** para app móvil real — no WebView
7. **Node.js + Express** para la API común
8. **Stripe solo en modo test** y no antes de Fase 5
9. **Academy separada** — no fusionar hasta Fase 7
10. **martialapp.com (Laravel) no se toca** — solo referencia funcional
11. **API primero** — ningún frontend sin endpoint correspondiente
12. **generated/prisma/** no se sube a GitHub
13. **Vercel** para hosting web — deploy automático desde GitHub
14. **martialapp.online** — prototipo visual (Hostinger), no el app real

---

## Reglas de trabajo

- Un módulo a la vez. No pasar al siguiente hasta que funciona.
- Commits pequeños y frecuentes. Cada cambio que funciona, a GitHub.
- No usar `git add .` si solo queremos subir archivos concretos.
- El schema de Prisma no se cambia sin pensarlo bien.
- No mezclar Academy con la app principal todavía.
- No construir pagos ni memberships en fases iniciales.
- No migrar datos reales todavía.
- Mantener este archivo actualizado al inicio y al final de cada sesión.
- **Siempre `git pull` antes de empezar a trabajar** — especialmente si hay más de un ordenador o sesión activa.

---

## Lo que NO se construye todavía

- Pagos reales / Stripe webhooks
- GoCardless / Redsys
- Módulo de Academy integrado
- Login unificado con Academy
- Reports avanzados con datos reales
- Notificaciones push / SMS reales
- Migración de datos reales de Laravel
- Cualquier cambio en martialapp.com — no tocar
- NativeWind
- Diseño mobile real

---

## Referencias

- Supabase dashboard: https://supabase.com/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- GitHub repo: https://github.com/MartialOneOnline/martial-v2
- App live: https://martial-v2-web.vercel.app
- Prototipo live: https://martialapp.online
- Figma mobile: sSrSP43cOvx4d0MA1NKg8U (login: 3:83 · register: 3:138)
- Figma web landing: wLZEV2ENEGFDvNQNv2L532
- Figma dashboard: CnmTRNGObXJeKJiXBagsPj
- Figma referencia NZZL UI: i13PsZZiuRJ3sxSsRDs3RB
  - Users page (Option 3): node 8460:12431 — tabla limpia, tabs underline, search dentro tabla, paginación, acción ojo+menú, bloque "User verification" al pie
  - Dashboard: node 2502:30216 — KPI cards con progress bar, multi-line revenue chart, "Issues & disputes" + "Change log" en 2 columnas, date picker en topbar
