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
**Estado:** Sesión 47 completada ✅ — Sprint 1 Platform Safety completado

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
| `/my/progress` | ⚠️ Partial | Grading history real; progress donut hardcoded al 75% — pendiente fix |
| `/my/membership` | ✅ Live | Ver activas + pause/cancel + request new plan + historial |
| `/my/classes` | ✅ Live | Horario + bookings + sección Passes & Trials |

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

### Sprint 1 — Platform Safety ✅ COMPLETADO
1. **Auth middleware `/my/**`** — ✅ Ya existía y funciona en `proxy.ts` (Next.js reconoce proxy.ts como middleware)
2. **Ownership audit completo** — ✅ Toda la superficie verificada. Patrón correcto en todos los endpoints: `/my` compara `resource.userId !== dbUser.id` desde DB; `/dashboard` usa `schoolId` de cookie + filtra `{ id, schoolId }` en todas las queries
3. **Booking atomicity** — ✅ Ya estaba implementado: duplicate check + capacity check + create dentro de `prisma.$transaction()`
4. **Membership → SchoolMember sync** — ✅ Implementado (commit `e1cb9d1`): pause→FROZEN, resume→ACTIVE, cancel→INACTIVE. School.cancelPolicy (IMMEDIATE | UNTIL_END_OF_PERIOD) con lazy expiration sin cron

### Sprint 2 — Business Rules (P1)
5. **Class access filtering en `/api/my/school-classes`** — filtrar occurrences por membership activa + classAccess rules + créditos disponibles (no solo en POST booking)
6. **Booking endpoint re-validación** — backend debe volver a validar elegibilidad aunque frontend ya filtre

### Sprint 3 — Data & UX (P2-P3)
7. **Eliminar `Membership.classesUsed` como source of truth** — única fuente: `count(Bookings where membershipId and status != CANCELLED)`
8. **Progress donut** — eliminar porcentaje hardcodeado (0.75); mostrar belt + degree + última grading + próximo milestone
9. **Currency fix en payments summary** — usar `School.currency`, no hardcodear EUR
10. **Avatar upload** — conectar botón de cámara en `/my/profile` a Supabase Storage

### Backlog
11. **Stripe Checkout** — flujo de pago real para membresías (Fase 5)
12. **Admin: aprobar membresías PENDING** — notificación al admin + acción de activar desde dashboard
13. **Class images para otras 19 escuelas** — solo Roger Gracie Málaga tiene imágenes en Supabase Storage
14. **Disciplines faltantes** — nogi, mma, boxing, karate, muay-thai, judo, kickboxing tienen `disciplineId=null`
15. **Color System — migración pendiente**: Payments page, Members table, transaction table
16. **SSO OAuth** — configurar Google en Supabase
17. **API deploy** — Railway o Render
18. **Dominio propio** — conectar app.martialapp.online a Vercel
19. **Email sending real** — conectar templates de Resend (welcome, trial confirmed, membership receipt ya implementados pero sin envío real)

---

## Historial de sesiones

### Sesión 47 — 2026-06-23 ✅
**Sprint 1 Platform Safety — completado**

- Auth middleware `/my/**` — verificado que `proxy.ts` ya actúa como middleware en Next.js/Turbopack. Intento de crear `middleware.ts` generó conflicto → eliminado. Protección confirmada con `curl`: `GET /my → 307 /login?redirect=%2Fmy`
- Ownership audit — pase completo sobre toda la superficie PATCH/DELETE/POST. Sin vulnerabilidades. Patrón correcto y consistente en todos los endpoints
- Booking atomicity — ya estaba implementado correctamente en commit `c161577`
- Membership → SchoolMember sync — implementado: `School.cancelPolicy` (IMMEDIATE | UNTIL_END_OF_PERIOD, default IMMEDIATE), `cancelMembership()` respeta policy + sincroniza SchoolMember, `checkAndExpireMembership()` lazy expiration sin cron, pause/resume sincronizan SchoolMember (FROZEN/ACTIVE), toggle en Settings > Payments
- `prisma db push` + `prisma generate` ejecutados — `cancelPolicy` en Supabase ✅

---

### Sesión 46 — 2026-06-23 ✅
**Audit técnico completo del portal /my + V2 Replacement Readiness Risk Map**

Sesión de auditoría (sin modificación de código). Resultado: mapa de riesgo P0-P4 y sprint plan acordado para la migración V1 → V2.

**Hallazgos principales del portal /my:**
- Dashboard, Classes, Membership, Payments — funcionales con datos reales
- Settings, QR, Help, Privacy — stubs ("Coming soon")
- Progress donut — hardcodeado al 75% (`const progress = 0.75`), no calculado
- Payments summary — moneda hardcodeada a EUR (`fmtPrice(totalSpent, 'EUR')`)
- Avatar upload — botón UI presente, sin backend
- `/api/my/school-classes` — no filtra por classAccess rules del plan
- `Membership.classesUsed` — campo sin incremento en el código; conteo real viene de `count(Bookings)`

**Blockers identificados para V1 replacement (P0):**
1. Sin middleware auth en `/my/**` — páginas accesibles sin sesión server-side
2. Ownership audit pendiente — superficie PATCH/DELETE/POST sin verificación sistemática
3. Booking race condition — capacity check y create en 2 queries sin transaction
4. Membership cancel no sincroniza `SchoolMember.status` — roster de escuela queda stale

**V2 Replacement Readiness — criterio acordado:**
> "No migramos cuando las pantallas están terminadas. Migramos cuando el sistema protege las relaciones del negocio."

Sprint plan guardado en `CONTEXT.md > Próximos pasos` y en memory `project_v2_replacement_readiness.md`.

---

### Sesión 45 — 2026-06-22 ✅
**Student portal: buy memberships, pause/cancel, passes & trials**

- `feat(my)`: MembershipStatus.PENDING añadido al schema + `prisma db push` + `prisma generate`
- `feat(my)`: `GET /api/my/school-plans` — planes públicos de la escuela del alumno
- `feat(my)`: `PATCH /api/my/memberships/[id]` — acciones pause / resume / cancel sobre membership propia
- `feat(my)`: `POST /api/my/memberships/[id]` — solicitar un plan (crea Membership PENDING)
- `feat(my/membership)`: Sección "Available Plans" con CTA Request/Book trial; Pause/Resume/Cancel en subscripciones activas con confirm modal; badge PENDING en membresías pendientes de aprobación
- `feat(my/classes)`: Sección "Passes & Trials" en tab Book — muestra planes SINGLE_PASS y TRIAL disponibles con "Get pass" / "Book trial"
- `fix(dashboard)`: Badge color PENDING añadido a MembershipsClient

---

### Sesión 44 — 2026-06-22 ✅
**Explore: day strip + ClassCard null guard**

- `feat(explore)`: Day strip en `/explore` — filtra clases por día de la semana, ordenadas por hora (`7b2612a`)
- `fix(explore)`: Guard contra `schedule=null` que crasheaba ClassCard (`8a31312`)

---

### Sesión 43 — 2026-06-22 ✅
**`/my/classes` redesign to match Figma + Cancel Booking button**

- `fix(my)`: Disable router cache en `/my/classes` + rediseño completo de class cards para igualar Figma (`1ea3be7`)
- `feat(classes)`: Botón "Cancel Booking" en class card cuando el alumno ya tiene reserva activa (`46e349b`)

---

### Sesión 42 — 2026-06-22 ✅
**BJJ belts + /my student portal completo (bookings, cancelación, school view)**

- `feat(belts)`: 36 SVGs de cinturones BJJ desde Figma (`/public/belts/`) + visualización en student dashboard (`4e050d3`)
- `fix(my)`: Disable prefetch en links protegidos para evitar session race (`dbc1ea8`)
- `fix(timetable)`: Eliminar prop CSS `truncate` inválida (`bc0cd34`)
- `feat(my)`: Confirmación de booking, cancelación, y vista de compañeros de clase — `DELETE /api/my/bookings/[id]` + UI updated (`8d452f0`)
- `fix(booking)`: Eliminar check `isPublished` — clases no publicadas en DB (`d2a5555`)
- `fix(my)`: Horarios de clases + disponibilidad de booking (`02cdf02`)
- Multiple `fix(auth)`: Middleware proxy.ts estabilizado para Next.js 16 (exports 'proxy', SSR cookie refresh) (`bb2cf47`, `77503fd`, `95a23bc`, `9701a19`)
- `feat(my)`: Sidebar school-céntrico — elimina Explore, muestra branding de la escuela (`d520581`)
- `fix(nav)`: Clean sidebar, middleware export fijo, páginas placeholder `/my/qr` y `/my/settings` (`2d46023`)
- `feat(my)`: Clases reservables en dashboard de usuario y página de horario — `GET /api/my/school-classes` (`1f1da7a`)

---

### Sesión 41 — 2026-06-22 ✅
**Homepage search-first redesign**

- `feat(homepage)`: Rediseño homepage — `HomeSearch`, `HomeCamps`, `HomeThreeValues`, `HeroSection` actualizados (`fafa7de`)

---

### Sesión 40 — 2026-06-22 ✅
**Auth flow completo + email templates + sign out**

- `feat(email)`: Templates de email — welcome student, trial confirmed, membership receipt (`e00bc8c`)
- `feat(header)`: Botón "Sign out" en header cuando el usuario está logueado (`b70981a`)
- `feat(auth)`: `GET /api/auth/signout` route (`26e6981`)
- `fix(auth)`: Cookies en signout route + redirect a homepage usando request URL (`6b8858e`, `d53df6a`)
- `fix(auth)`: Preserve redirect param through login flow (`ce28216`)
- `fix(auth)`: Fall back a email lookup cuando `supabaseAuthId` no está enlazado (`5955405`)
- `feat(auth)`: Role-based access en `/dashboard`, `/my`, `/admin` via proxy.ts + dashboard layout (`2338940`)
- `fix(auth)`: Redirect students a `/my` en lugar de `/explore` tras login (`ae7f82e`)
- `fix(auth)`: Logout route — handle GET, fix anon key env var, cookies en response (`2122e9b`, `8c95080`)
- `fix(auth)`: Client-side signOut en sidebar en lugar de form POST (`9e32d57`)
- `fix(auth)`: Create middleware.ts para activar Supabase SSR cookie refresh (`e7412df`)

---

### Sesión 39 — 2026-06-16 ✅
**Full module audit + P1 fixes + no-show write path + attendance index + repo clean**

**Module audit completed (audit-only, no files modified):**
- Users, Memberships, Payments, Classes/Attendance, Reports all reviewed
- P1 bugs identified: `paymentMethod` not saved on manual transactions; student profile showing `t.type` instead of `t.paymentMethod`; NO_SHOW status unreachable from UI; no DB index on `Booking(userId, attendedAt)`

**P1 fixes applied:**
- `POST /api/dashboard/transactions` now saves `paymentMethod` from request body — commit `8ef4901`
- Student profile `transactions[].method` now reads `t.paymentMethod ?? '—'` instead of hardcoded `t.type` — commit `8ef4901`
- Student profile `transactions[].status` now reads `t.status` instead of hardcoded `'PAID'` — commit `adbe074`

**NO_SHOW write path added** — commit `44a8332`
- New `PATCH /api/dashboard/bookings/[id]/no-show` — staff-only (OWNER/ADMIN/INSTRUCTOR); sets `status = 'NO_SHOW'`; does not touch `attendedAt`; scoped to school via `class.schoolId`
- Uses `canMarkNoShow(status)` from `lib/services/attendance.ts`; COMPLETED + CANCELLED blocked with 422; idempotent for already-NO_SHOW
- `BookingsDrawer` PENDING/CONFIRMED rows now show "Attended" (blue) + "No-show" (red) buttons side by side; row updates in-place; NO_SHOW rows show badge only
- Reports / Absents can now accumulate real no-show data from staff drawer actions

**Users report lastAttendedAt** — commit `5649322`
- `GET /api/dashboard/reports/users` batch-fetches `lastAttendedAt` per user from `Booking.attendedAt` (not null, desc, distinct by userId, school-scoped)
- `UsersReportClient` adds "Last Attended" column; shows formatted date or `—`; colSpan updated to 7

**DB index for attendance queries** — commit `d87d965`
- `@@index([userId, attendedAt])` added to `Booking` in `prisma/schema.prisma`
- Applied to Supabase via `npx prisma db push` (non-destructive, index-only change)

**V1 email redesign committed** — commits `e9dedf1`, `9fdd747`, `0797797`
- `apps/web/lib/email/sendInvite.ts` + `inviteSchool.ts` + admin email-preview route updated
- `v1-email-redesign/` — new Blade layout + 5 partials + 4 templates for Zeeshan to apply to Laravel V1
- `docs/v1-email-redesign-brief.md`, `v1-email-type-map.md`, `martial-email-patterns.md` committed
- Generated HTML preview files and `.DS_Store` deleted

**Repo housekeeping** — commits `343b7dc`, `610c03e`
- Two stale Claude agent worktrees removed (`agent-aa50da30fe2c363af`, `agent-ac70638e929fb22f8`)
- `canMarkNoShow` guard committed to `lib/services/attendance.ts`
- Working tree clean, `main` up to date on origin
- **63 tests passing**, types clean

**Classes: No-show marking action in BookingsDrawer** — commit `44a8332`
- New `PATCH /api/dashboard/bookings/[id]/no-show` — staff-only (OWNER/ADMIN/INSTRUCTOR); sets `status = 'NO_SHOW'`; does not touch `attendedAt`; booking scoped to current school via `class.schoolId` join
- Uses `canMarkNoShow(status)` from `lib/services/attendance.ts` (pure guard, already existed); COMPLETED returns 422 "Cannot mark an attended booking as no-show"; CANCELLED returns 422; idempotent for already-NO_SHOW bookings
- `BookingsDrawer` (`ClassesClient.tsx`) — PENDING/CONFIRMED rows now show two buttons: "Attended" (blue) and "No-show" (red); clicking "No-show" calls the new endpoint and updates the row in-place (`status → NO_SHOW`); NO_SHOW rows show the red "No-show" badge from `BookingStatusBadge` with no further action available
- Reports / Absents (`/dashboard/reports/absents`) can now accumulate real `NO_SHOW` data from staff action in the drawer — previously unreachable from the UI
- No Prisma schema changes (`NO_SHOW` already existed as a `BookingStatus` enum value)
- **63 tests passing**

### Sesión 38 — 2026-06-16 ✅
**Reports / Users: lastAttendedAt added to member list**
- `apps/web/app/api/dashboard/reports/users/route.ts` — `lastAttended` query added in parallel with `activeMemberships` via `Promise.all`; single `prisma.booking.findMany` with `attendedAt: { not: null }`, `orderBy: { attendedAt: 'desc' }`, `distinct: ['userId']`, scoped to current school; builds `lastAttendedByUser` map; each member in response now includes `lastAttendedAt: string | null`
- `apps/web/app/dashboard/reports/users/UsersReportClient.tsx` — `MemberRow` interface gains `lastAttendedAt: string | null`; "Last Attended" header added between Joined and Status (7 columns total); `<td>` renders `fmtDate(m.lastAttendedAt)` or `—` in muted grey when null; loading/empty `colSpan` updated from 6 → 7
- All existing filters (belt, dateFrom, dateTo, status, search) and pagination unchanged
- No Prisma schema changes (`attendedAt` already existed on `Booking`)
- **63 tests passing**

### Sesión 37 — 2026-06-16 ✅
**Reports / Absents: NO_SHOW tracking added alongside CANCELLED** — commit `6e18103`
- `apps/web/app/api/dashboard/reports/absents/route.ts` — `NO_SHOW` bookings now fetched in parallel with `CANCELLED`; per-member `MemberAgg` gains `noShowCount` field; stats response adds `totalNoShows` and `noShowMembers`; `trendData` points and `dowData` day entries each include a `noShows` series
- `apps/web/app/dashboard/reports/absents/AbsentsReportClient.tsx` — 5th stat card added for No-Shows (`totalNoShows` / `N members`); day-of-week bar chart gains second `<Bar>` for no-shows (dark red); absence trend chart gains second dashed `<Area>` for no-shows; member table Cancellations column shows `Nx cancelled` + `Nx no-show` sub-badge when `noShowCount > 0`
- At-risk threshold (`3+ cancellations`) remains based on `CANCELLED` count only — `NO_SHOW` is tracked but does not affect the threshold
- No Prisma schema changes (`NO_SHOW` already existed as a `BookingStatus` enum value)
- **63 tests passing**

### Sesión 36 — 2026-06-16 ✅
**Classes: Mark All Attended button in BookingsDrawer** — commit `2a6379f`
- "Mark all attended (N)" button added below the date picker in `BookingsDrawer`; visible only when eligible bookings exist (not COMPLETED, not CANCELLED); label shows live eligible count
- Calls `PATCH /api/dashboard/bookings/[id]/attend` for all eligible bookings in parallel via `Promise.allSettled` — one failure does not block the rest
- Successful rows update in-place immediately; button disables and shows "Marking…" while in flight
- Partial failures surfaced as inline error: `N booking(s) could not be marked attended`; error resets on date change or drawer reopen
- No new API endpoint (reuses existing per-booking attend endpoint), no Prisma schema changes, no QR check-in
- **63 tests passing**

### Sesión 35 — 2026-06-16 ✅
**Classes: BookingsDrawer UI for per-booking attendance marking** — commit `13e4680`
- `apps/web/app/dashboard/classes/ClassesClient.tsx` — new `BookingsDrawer` component; opens via "View bookings" in each class row's `⋯` menu; shows bookings for a selected date with a "Mark attended" button per row
- "Mark attended" calls `PATCH /api/dashboard/bookings/[id]/attend`; row updates in-place (status → COMPLETED, attendedAt timestamp shown) without full reload
- COMPLETED rows show a green `✓` (CheckCircle2) instead of the button; CANCELLED rows are dimmed with no action
- Attendance summary counter shown in drawer header: `attended / total`
- `GET /api/dashboard/classes/[id]/bookings` extended: accepts `?date=YYYY-MM-DD` param (defaults to today); response now includes `attendedAt` and `scheduledAt` fields; CANCELLED bookings are included so staff sees the full list
- No QR check-in, no full class session page — drawer-only UI
- No Prisma schema changes
- **63 tests passing**

### Sesión 34 — 2026-06-16 ✅
**Classes: per-booking attendance marking endpoint** — commit `6857d97`
- New `PATCH /api/dashboard/bookings/[id]/attend` — staff-only (OWNER/ADMIN/INSTRUCTOR); sets `attendedAt = now` and `status = COMPLETED`
- Booking scoped to current school via `class.schoolId` join — no cross-school access possible
- CANCELLED bookings return 422 "Cannot mark a cancelled booking as attended"
- Idempotent: already-COMPLETED + `attendedAt` set returns 200 without a DB write
- New `apps/web/lib/services/attendance.ts` — pure `canMarkAttended(status, attendedAt)` helper extracted for testability; returns `{ ok, alreadyDone }` or `{ ok: false, reason, httpStatus }`
- New `apps/web/__tests__/attendanceMarking.test.ts` — 6 unit tests covering: PENDING/CONFIRMED/NO_SHOW allowed, CANCELLED blocked (422), idempotent COMPLETED, COMPLETED-without-attendedAt edge case
- No Prisma schema changes (`attendedAt` and `COMPLETED` status already existed in schema)
- No QR check-in, no class session UI — backend-only
- **63 tests passing**

### Sesión 33 — 2026-06-16 ✅
**Classes: Calendar fetches real class data from API (hardcoded demo removed)** — commit `4d0e469`
- `CalendarClient.tsx` — removed `SCHEDULE` constant (26 fake entries) and hardcoded `TODAY = new Date(2026, 5, 4)` / `NOW_H = 10` / `NOW_M = 30`
- Fetch effect on mount: calls `GET /api/dashboard/classes`, maps each `ApiClass` via new `apiClassToSlots()` helper into `ClassSlot[]`; `dayOfWeek` (JS: 0=Sun) converted to calendar convention (Mon=0…Sun=6) via `(dow + 6) % 7`
- Month view: `classesForDate(date, classes)` uses live `classes` state; loading and error states shown while data is in flight
- Week view: `classes.filter(s => s.day === dow)` replaces `SCHEDULE.filter`
- Today derived from `useState(() => new Date())` — no hardcoded date; `nowH`/`nowM` derived from it for week-view auto-scroll
- Fake location/room filter bar removed from live calendar; `DRAWER_LOCATIONS`/`DRAWER_ROOMS` stubs kept local to `AddClassDrawer` form only
- `ClassPopup`: location/room section removed (fields no longer on `ClassSlot`)
- `WeekClassBlock`: room name line removed
- No new API endpoint (reuses existing `GET /api/dashboard/classes`), no Prisma schema changes
- TypeScript clean, **57 tests passing**

### Sesión 32 — 2026-06-16 ✅
**Payments: safety hardening — Phase 5 guards on refunds and deletes** — commit `be67282`
- `PATCH /api/dashboard/transactions/[id]`: REFUNDED removed from allowed statuses; returns 403 "Refunds require Phase 5 accounting workflow." — marked `TODO(phase-5-refunds)`
- `DELETE /api/dashboard/transactions/[id]`: deletion blocked for PAID and REFUNDED transactions with 403 "Paid transactions cannot be deleted. Use Phase 5 refund workflow." — PENDING and FAILED still deletable — marked `TODO(phase-5-audit-trail)`
- `TransactionsClient.tsx`: "Mark as Refunded" action removed from row menu; existing REFUNDED records remain visible in the filter tab and status badge; `handleDelete` now surfaces the API error message via alert instead of silently ignoring a rejected delete
- No Prisma schema changes, no Stripe, no refund mirror transactions, no invoice, no direct debit

### Sesión 31 — 2026-06-16 ✅
**Payments: membership assignment unified through assignPlan() service** — commit `2710559`
- `POST /api/dashboard/memberships` now delegates to `lib/services/membership.ts:assignPlan()` instead of calling `prisma.membership.create()` directly
- Membership assignment from Payments / Subscriptions modal now atomically: creates a `Transaction` for paid plans, cancels any existing ACTIVE membership, promotes `SchoolMember.status` from PENDING/LEAD → ACTIVE, computes `endDate` from plan billing rules
- Free/trial plans (price = 0) still skip transaction creation (existing `assignPlan` behavior preserved)
- Route now requires `userId` + `planId` (was: `userId` + `planName` + `startDate`); resolves `User.id → SchoolMember.id` via one extra lookup
- No Prisma schema changes, no Stripe work, no refund logic
- **57 tests passing**

### Sesión 30 — 2026-06-16 ✅
**Memberships classAccess enforcement + Users module fixes** — commits `278bd7c`, `dd5b250`, `0859ce2`

**classAccess enforcement in booking API (commit `0859ce2`)**
- New `apps/web/lib/services/classAccess.ts` — pure `checkClassAccess(classAccess, classId, counts)` function; no Prisma dependency; evaluates per-class rules (included/unlimited/PER_WEEK/PER_MONTH/TOTAL) and global booking cap
- `apps/web/app/api/bookings/route.ts` — membership query now includes `plan.classAccess`; 5 parallel count queries (per-class ×3 + global ×2) run only when rules are present; returns 403 with descriptive message when any rule is exceeded; zero overhead for plans without classAccess rules
- `apps/web/__tests__/bookingValidation.test.ts` — 14 new tests for `checkClassAccess()` covering all branches; **27 tests total, all passing**
- No Stripe touched, no /join routes, no Prisma schema changes

**Users module fixes (commit `278bd7c`)**
- `UsersClient.tsx` — `handleMarkAsPaid` now sends real `amount` and `currency` from `activeMembership` instead of hardcoded `amount: 0` / `currency: 'EUR'`
- `users/page.tsx` — `price` and `currency` added to the mapped `activeMembership` object so values flow to the client
- `Student` type updated with `price: number` and `currency: string` on `activeMembership`

**Auth guard on student profile (commit `278bd7c`)**
- `dashboard/users/[id]/page.tsx` — added role guard (OWNER/ADMIN/INSTRUCTOR only) using `getAuthUser()` + `getCurrentSchoolId()` (with DB fallback) + `requireSchoolAccess()`; member query now requires both `id` AND `schoolId` (no conditional spread); students and wrong-school viewers get 404

**Stub actions hidden (commit `dd5b250`)**
- Hidden behind `TODO` comments: Send Message, Invoice, Send Waiver, Sync Membership (list menu) + Invitar + More button (student profile)
- Tags: `TODO(send-message)`, `TODO(sync-membership)`, `TODO(invoice)`, `TODO(waiver)`, `TODO(profile-invite)`, `TODO(profile-more)`

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
