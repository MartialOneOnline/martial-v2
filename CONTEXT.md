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
**Estado:** Sesión 29 completada ✅ — Payments module conectado a datos reales (transactions + subscriptions)

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

Modelos: `User`, `School`, `Discipline`, `SchoolDiscipline`, `Instructor`, `MembershipPlan`, `Review`, `Class`, `Booking`, `Membership`, `Camp`, `CampBooking`, `SchoolMember`, `SchoolClaim`, `Partner`, `UserPreference`, `SchoolInvitation`
Campos añadidos: `Class.coverUrl String?`, `School.v1UserId`, `School.description`
Tablas en Supabase: todas sincronizadas con `prisma db push`

---

## Páginas del usuario (/my) implementadas

| Ruta | Estado | Notas |
|---|---|---|
| `/my` | ✅ Live | Dashboard personal: escuelas, info personal, links a secciones |
| `/my/profile` | ✅ Live | Editar nombre, teléfono, fecha de nacimiento — PATCH /api/my |
| `/my/progress` | ⏳ Pendiente | Ranking / cinturón |
| `/my/membership` | ⏳ Pendiente | Suscripciones activas |
| `/my/classes` | ⏳ Pendiente | Horario + bookings |

---

## Flujo de invitación (invite flow)

1. Admin invita desde `/dashboard/users` → magiclink con `redirect_to=/auth/accept-invite`
2. Email → click → `layout.tsx` script inline intercepta el hash y redirige a `/auth/set-password#access_token=...`
3. `/auth/set-password` — decodifica email del JWT (`atob`), llama `setSession`, user crea contraseña
4. `POST /api/auth/activate-member` — status `PENDING → LEAD`, devuelve redirect según rol
5. Redirect: STUDENT → `/my`, OWNER/ADMIN/INSTRUCTOR → `/dashboard`

**Resend invite:** usa magiclink (no `invite` type — inválido para usuarios existentes en Supabase).
**Delete member:** también elimina de Supabase Auth (`admin.deleteUser`) para poder re-invitar el mismo email.

---

## Próximos pasos

1. **Memberships module** — CRUD completo: crear, editar, asignar a miembros
2. **Class images para otras 19 escuelas** — imágenes de V1 en el ZIP, solo Roger Gracie Málaga tiene imágenes en Supabase Storage
3. **Disciplines faltantes** — nogi, mma, boxing, karate, muay-thai, judo, kickboxing tienen `disciplineId=null` en clases importadas
4. **Color System — migración pendiente**: Payments page, Members table, transaction table, super admin pipeline
5. **`/my/progress`** — página de ranking y cinturón del alumno
6. **`/my/membership`** — suscripciones activas del alumno
7. **`/my/classes`** — horario + bookings del alumno
8. **SSO OAuth** — configurar Google en Supabase
9. **API deploy** — Railway o Render
10. **Dominio propio** — conectar app.martialapp.online a Vercel

---

## Historial de sesiones

### Sesión 29 — 2026-06-14 ✅
**Payments module: transactions + subscriptions con datos reales** — commit `b14df5b`
- **Schema** — nuevo enum `TransactionStatus` (PAID/PENDING/FAILED/REFUNDED) + campo `status` en `Transaction` (default PAID); `db push` sin pérdida de datos
- **`/api/dashboard/transactions`** (nuevo) — GET con filtros (status, search, page, pageSize), aggregates (totalRevenue, countByStatus); POST crea transacciones
- **`TransactionsClient.tsx`** — reescrito: fetch server-side con paginación real, drawer carga miembros reales desde `/api/dashboard/members`, guarda en API real
- **`PaymentSubscriptionsClient.tsx`** — reescrito: carga membresías activas desde `/api/dashboard/members`; KPIs calculados de datos reales; botón "Asignar membresía" enlaza a `/dashboard/users`
- **`/api/dashboard/members`** — extendido `activeMembership` con `price`, `currency`, `planType`
- Eliminados todos los mocks `TRANSACTIONS[]` y `SUBSCRIPTIONS[]` hardcodeados

### Sesión 28 — 2026-06-13 ✅
**Estabilización: booking real, dashboard/preview, publish workflow, lint** — commits `14942c3`, `fd7a032`, `568fd0f`, `8fa06b1`, `40e63e7`
- **`lib/scheduling.ts`** — `nextOccurrence()` extraído como módulo reutilizable tipado; UTC por defecto (sin `School.timezone` todavía); documentado
- **`ClassBookingModal`** — `scheduledAt` calculado con `nextOccurrence()` desde slot seleccionado; nunca usa `new Date()` como sustituto
- **Booking server** — valida que `scheduledAt` coincide con entrada real del schedule; mantiene todas las validaciones de `c161577`
- **`TrialBookingCTA`** — sustituye `mailto:` por flujo interno; 1 trial → directo; varias → picker; ninguna → email/WhatsApp fallback
- **`proxy.ts`** — `/dashboard/preview` siempre público; `/dashboard/**` requiere sesión; eliminado `middleware.ts` duplicado (conflicto Next.js 16)
- **`DashboardOnboarding`** — nuevo componente para usuarios sin escuela (en lugar de 403)
- **`DashboardClient`** — elimina fallbacks silenciosos a datos ficticios
- **`ClassesClient`** — controles Draft/Published visibles; solo OWNER/ADMIN pueden publicar
- **`explore/page.tsx`** — filtra `isActive=true AND isPublished=true`
- **`scripts/publish-classes.ts`** — script dry-run seguro; `--apply` explícito requerido para escribir
- **ESLint 9** en `apps/api`; turbo lint wired; 0 errores / 250 warnings cosméticos
- **43 tests pasando** (scheduling + nextOccurrence + booking edge cases)
- **Build limpio** — `npm run build` OK en Next.js 16 / Turbopack

### Sesión 27 — 2026-06-13 ✅
**Memberships module** — commit `c34a597`
- `MembershipPlan`: `classAccess Json` (reglas flexibles por clase), `planType`, `validityDays`, `isPublic`; eliminado `classLimit` + `features`
- API routes: `GET/POST /api/dashboard/membership-plans` + `PUT/DELETE /[id]`; devuelve `memberCount` en tiempo real
- `MembershipsClient`: 3 tabs (Subscriptions / Single Passes / Trials); drawer con `ClassAccessBuilder` — toggle incluir/excluir, unlimited/limited, limit + frecuencia (week/month/total), cap global
- Schema `db push` sin reset; Prisma client regenerado

### Sesión 26 — 2026-06-13 ✅
**Classes + Events avanzado** — commits `354bf74`, `c161577`
- `bookingSettings Json?` en `Class` + `defaultBookingSettings Json` en `School`; tipo `BookingSettings` con helpers `minsToHoursAndMins`/`hoursAndMinsToTotal`
- `ClassesClient`: banner upload, inputs numéricos `inputMode="numeric"`, multi-slot por día, payment method chips, `isPublished` toggle, `BookingSettingsSection` colapsable
- `EventsClient`: reescritura completa con API real; `EventTicket` model (Option B); ticket builder UI; payment method toggles
- Seguridad `c161577`: `guardSuperadmin()`, 10 rutas admin protegidas, validación booking server-side (auth, clase activa+publicada, fecha futura, membresía, capacidad, duplicados)

### Sesión 25 — 2026-06-13 ✅
**Mobile view perfection** — `fix(mobile)` commit `0d7bd05`
- `MembersAndAcademies.tsx` — eliminadas animaciones framer-motion `whileInView` (contenido quedaba invisible en móvil hasta que el IntersectionObserver disparaba)
- `Testimonials.tsx` + `PaymentMethods.tsx` — añadido `viewport={{ amount: 0 }}` para animar en cuanto entra cualquier pixel en vista
- Todos los topbars del dashboard — eliminado `flex-wrap` para que los items nunca se vayan a segunda fila
- `ClassesClient` + `EventsClient` — search box es ahora `flex-1` (antes `minWidth: 180/200` fijo)
- `EventsClient` + `PaymentSubscriptionsClient` — botón crear muestra solo icono en móvil (`<span className="hidden sm:inline">`)
- `UsersClient` — texto "Filtrar" oculto en móvil (solo icono), filter tabs horizontalmente scrollables (`overflow-x-auto`) en lugar de `flex-wrap`
- Sidebar dashboard — abre correctamente en móvil vía `#burger-btn` + contexto `DashboardContext`

### Sesión 24 — 2026-06-13 ✅
**V1 data import, claim flow, class images** — commits `14e29d4`, `2fb8f65`, `46f2e92`
- `scripts/import-schools-from-v1.ts` — importa 20 escuelas reales de V1 desde CSV (users + userdetails)
- `/api/claim/[id]/route.ts` — GET (fetch invitation) + POST (crea Auth user, SchoolMember OWNER, UserPreference.lastSchoolId)
- `/claim/[id]/page.tsx` — página de onboarding de propietario de escuela
- `getCurrentSchoolId()` — fallback a `UserPreference.lastSchoolId` cuando no hay cookie (fix: dashboard mostraba 0 clases tras claim flow)
- `Class.coverUrl String?` — añadido a schema Prisma, db push + generate
- `ClassesClient` — muestra thumbnail de imagen si existe `coverUrl`, icono calendario si no
- Supabase Storage bucket `class-images` creado, imágenes de V1 subidas para Roger Gracie Málaga (6 clases + 4 eventos limpios)
- `NEXT_PUBLIC_APP_URL` = `https://martial-v2-web.vercel.app` en `.env.local`

### Sesión 23 — 2026-06-13 ✅
- **`guardSuperadmin()`** — helper reutilizable en `lib/auth/server.ts`
- **10 admin API routes protegidos** — users, stats, reports, schools, schools/all, schools/verify (GET+PATCH), invitations (GET+PATCH+POST), invitations/import, email-preview → 401/403
- **Admin pages** — `app/admin/layout.tsx` convertido a server component con redirect si no SUPERADMIN
- **`/api/classes`** — añadido `isPublished: true` + `status: { not: 'SUSPENDED' }` en school
- **`/api/schools`** — excluye escuelas SUSPENDED
- **`/api/bookings`** — validación completa: clase activa+publicada, fecha futura, dayOfWeek match, membresía activa, capacidad, duplicados
- **`/api/memberships/trial`** — comprueba `hasFreeTrialCls`, bloquea repetición aunque membresía cancelada/expirada
- **Hidratación #418 corregida** — `DashboardClient.tsx` (greeting, fechas) y `WeeklyTimetable.tsx` (activeDay) usan `useEffect` para resolver fechas client-side
- **`SUPABASE_SERVICE_ROLE_KEY` eliminado** — unificado a `SUPABASE_SECRET_KEY` en 4 archivos
- **27 tests automatizados** — guardSuperadmin (4), bookingValidation (9), trialEligibility (5), nextOccurrence (5) + 4 de duplicate + otros
- **Vitest configurado** — `vitest.config.ts`, `package.json` con script `test`
- **Type errors pre-existentes corregidos** — `classLimit` y `features` en `/api/my` y `school/[slug]/page.tsx`
- Verificado: `check-types` ✅, `test` 27/27 ✅, `build` ✅

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

### Sesión 22 — 2026-06-12 ✅
- **Color System v1.0** — sistema de colores centralizado implementado por fases
- `apps/web/lib/design/tokens.ts` — tokens completos: uiColors, martialColors, primaryColors, memberStatusColors, paymentStatusColors, gradients
- `apps/web/components/ui/StatusBadge.tsx` — badge compartido member status (soft/solid, sm/md)
- `apps/web/components/ui/PaymentBadge.tsx` — badge compartido payment status (soft/solid, sm/md)
- `apps/web/app/design/page.tsx` — preview page en `/design` con todos los tokens, badges y tabla de muestra
- `globals.css` — añadidas vars faltantes: `--color-surface-soft`, `--color-border-strong`, `--color-primary-pressed`, `--color-primary-border`, `--color-text-disabled`, `--martial-ai-soft`, `--martial-marketplace-soft`
- **UsersClient migrado** — eliminado `STATUS_MAP` local + `StatusBadge` local, importados componentes compartidos, `STATUS_FILTER_OPTIONS` derivado de tokens (cero hardcodes de colores)
- Commit: 3c6f78a

### Sesión 21 — 2026-06-11 ✅
- **Invite flow completo** — magiclink con redirect correcto a `/auth/set-password`
- `layout.tsx` — script inline en `<head>` intercepta hash antes de que React cargue
- `/auth/set-password` — decodifica email del JWT con `atob`, llama `setSession` para activar sesión
- `/auth/accept-invite` — página intermedia (redirect a set-password)
- `POST /api/auth/activate-member` — status PENDING → LEAD, redirect según rol (student=/my, school=/dashboard)
- **Delete member** — también elimina de Supabase Auth (`admin.deleteUser`) para poder re-invitar mismo email
- **Páginas /my** — `/my` (dashboard personal) + `/my/profile` (editar perfil: nombre, teléfono, DOB)
- `PATCH /api/my` — guarda nombre, teléfono, fecha de nacimiento
- `/api/my` — filtro schoolMembers ampliado para incluir LEAD + FROZEN (no solo ACTIVE)
- Commits: 7ea5484, 0afbc98, 53dbc18

### Sesión 20 — 2026-06-09 ✅
- **Booking flow completo** — clases clicables en WeeklyTimetable
- `ClassBookingModal` con 4 estados: loading / unauthenticated / no_membership / has_membership
- Sin login: CTAs "Log In to Book" + "Create Free Account" con return URL
- Sin membresía: muestra planes + Free Trial CTA prominente
- Con membresía: confirma booking con resumen (clase, día, hora, precio)
- `POST /api/bookings` — crea `Booking` en DB
- `POST /api/memberships/trial` — activa free trial (`SchoolMember` + `Membership`)
- `GET /api/schools/[slug]/membership-check` — check auth + membresía en Supabase
- `MembershipSection` rediseñada con tabs (Subscriptions / Passes / Private)
- Commit: c9f7768

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
