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
**Estado:** Rama activa **`feature/getting-started-checklist`**, sincronizada con `origin`. Sesión 75 cerrada y entregada a Codex Project Audit (ver `docs/PROJECT-AUDIT.md`) — Claude no se autoaprueba. La re-verificación de `/my` está completa a nivel de código/tests, pero no end-to-end autenticado. Los fixes del CTA público de reserva están publicados (`bf60cf8`, `e23bb58`) y el caso Roger Gracie Málaga fue probado en navegador, incluido viewport móvil, sin autenticación. En la Sesión 75 se retiró la pantalla SSO decorativa de `/login` (los proveedores todavía no están implementados) para entrar directamente por email, se extrajo la lógica de selección/normalización de clases a `apps/web/lib/trialBooking.ts` y se añadieron 4 regresiones unitarias. **Requisito confirmado para el cambio al dominio final `martialapp.com`: conectar login social real con Google, Apple y Microsoft (no Facebook), incluyendo configuración de proveedores y callbacks del dominio final.** El trabajo ajeno `apps/web/app/api/claim/request/` y `apps/web/app/claim/page.tsx` sigue intacto. **La auditoría global NO está completa:** faltan pruebas con sesión autenticada real de `/my`/reserva/registro, la rama real `hasFreeTrialCls: true` con clases `isTrial`, y el ciclo de confirmación por email real. Pendientes previos: abrir PR de `feature/getting-started-checklist`, probar su flujo completo, sandbox Revolut no soportado, unificación `martial_active_context`/`currentSchoolId` sin decidir y confirmación visual mobile del sidebar.

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

## Flujo de confirmación de email (registro self-serve)

Distinto del flujo de invitación de arriba — este es para quien se registra solo en `/register` (estudiante o escuela), no para quien es invitado por un admin.

1. `POST /api/auth/register` crea el usuario de Supabase con `email_confirm: false` (nunca auto-login) y un `User`/`School`/`SchoolMember` en Prisma de inmediato.
2. `generateLink({type: 'magiclink', redirectTo: '.../auth/confirm?redirect=...'})` + envío propio vía Resend (`lib/email/templates/confirmEmail.ts`, EN/ES/PT/FR) — nunca el email nativo de Supabase.
3. Usuario hace click → `/auth/confirm` redime el hash, `email_confirmed_at` queda seteado como efecto secundario, y reusa `resolveLoginRedirectAction()` (el mismo de `login/page.tsx`) para aterrizar en `/dashboard`/`/my`/`/choose-profile` según su contexto.
4. `proxy.ts` bloquea `/dashboard`, `/my`, `/admin` y sus APIs (`/api/dashboard`, `/api/my`, `/api/admin`) mientras `email_confirmed_at` sea `null`, redirigiendo a `/auth/verify-pending` (o 403 JSON en APIs).
5. `/auth/verify-pending` + `POST /api/auth/resend-confirmation` — reenvío con rate limit (IP + email) y que **nunca** genera un link para una cuenta ya confirmada (evita que este endpoint se use como canal de login sin contraseña).

**Gotcha real encontrado en vivo:** `layout.tsx` tiene un script inline (`resolveAuthHashRedirect()`) que intercepta *cualquier* página con `#...type=magiclink` en el hash y la manda a `/auth/set-password` — pensado solo para el flujo de invitación de arriba. Sin querer, también secuestraba `/auth/confirm` (mismo `type=magiclink`) antes de que su propio código corriera. Fix: `resolveAuthHashRedirect(hash, pathname)` ahora solo actúa cuando `pathname === '/'` (su intención original documentada: "cae en el homepage porque `redirect_to` no está en la allowlist"), nunca en una página que ya sabe manejar su propio hash.

---

## Próximos pasos

_Reescrito en la Sesión 71 (limpieza post-serie) — el backlog "Sprint 1/2/3" anterior (era Sesión 47) quedó obsoleto y parte de su contenido ya no era confiable (p. ej. marcaba Stripe Checkout como pendiente cuando sesiones posteriores lo dan por implementado). Si se necesita recuperar algún ítem de aquel backlog, está en el historial de git de este archivo._

1. **Confirmación visual manual en mobile real del sidebar dashboard** (Sesión 70, PR #12 ya mergeado — pendiente solo la confirmación del usuario):
   - link directo cierra el menú y navega
   - grupo/submenú expande sin cerrar el menú
   - link hijo (dentro de un submenú ya expandido) cierra el menú y navega
   - desktop sigue con el sidebar fijo, sin cambios
2. **Getting Started checklist (Sesión 73, rama `feature/getting-started-checklist`):**
   - rama actualizada con `main` (3 commits de retraso) y PR abriéndose ahora
   - probar en navegador el flujo completo (crear clase/plan/pago/alumno uno a uno y ver el checklist avanzar), confirmar el auto-promoción a `UNDER_REVIEW` y la persistencia del dismiss — nunca verificado en navegador, solo `check-types`/`lint`/`vitest` en verde
3. **Pagos sandbox**:
   - Stripe sandbox/checkouts/webhooks cuando se decida retomarlo
   - Revolut sandbox limitado/no soportado (host de producción hardcodeado en `register-webhook`) — documentar alternativa
4. **Auth/context follow-ups no urgentes** (documentados a lo largo de la serie de Sesiones 59-68, ninguno bloqueante):
   - decidir si unificar `martial_active_context` y `currentSchoolId` (dos cookies paralelas por diseño desde la Sesión 61)
   - evaluar si `dashboard/layout.tsx` debe gatear por contexto activo específico en vez de acceso staff global
   - re-auditar individualmente las ~90 rutas de `/api/dashboard/**` ya protegidas por `hasPermission()`/arrays manuales, si se quiere cerrar el 100% de la superficie
5. **Limpieza técnica**:
   - decidir qué hacer con las ramas antiguas de sesiones previas no tocadas en esta limpieza (`audit/tsc-revolut-register-webhook`, `claude/nice-haibt-837a37`, `fix/booking-validation-tests`, y las ya mergeadas sin worktree activo: `fix/checkin-walkin-hardening`, `fix/class-booking-trial-hardening`, `fix/payment-webhook-idempotency`, `fix/dashboard-permissions-schoolmember`, `fix/events-notifications-permissions`, `fix/test-suite-health`)
   - decidir si `cleanup_bookings_dupes.sql` (sin trackear en la raíz) debe quedarse como artefacto local, moverse a `docs/`, o borrarse
   - revisar `AGENTS.md` (sin trackear en la raíz) y decidir si debe trackearse o no

---

## Historial de sesiones

### Sesión 75 — 2026-07-21 ✅ (rama `feature/getting-started-checklist`, entregado a Codex Project Audit)
**Cierre de hallazgos verificables de la auditoría `/my` + reserva + registro.** El informe externo confirmó que la auditoría global aún no puede declararse completa: `/my` está revisado con endpoints/tests reales pero sin sesión autenticada end-to-end; el fix público de RGM funciona, aunque faltan la rama trial real, viewport móvil y reserva autenticada; el embudo de registro no se recorrió con correo real.

- `/login`: eliminada la pantalla inicial con botones Google/Facebook/Apple y handlers vacíos. Como SSO todavía no está implementado/configurado, el usuario llega directamente al formulario funcional de email; se eliminó también el código/iconos muertos y el botón Back hacia la pantalla placebo.
- Requisito de lanzamiento confirmado: cuando V2 pase a `martialapp.com`, implementar login social con **Google, Apple y Microsoft** (Microsoft sustituye al antiguo placeholder de Facebook), configurando en Supabase y en cada proveedor las URLs de callback del dominio final. Los botones no deben reaparecer antes de tener handlers y flujo end-to-end reales.
- Reserva pública: extraída lógica pura a `apps/web/lib/trialBooking.ts`. `selectCtaClasses()` conserva explícitamente la bifurcación trial vs. todas las clases; `buildBookingSession()` normaliza `schedule: null` sin lanzar excepciones.
- Regresión: `apps/web/__tests__/trialBooking.test.ts` cubre las dos ramas de selección, `schedule: null` y la sesión real Mon 19:00–20:30 de una clase programada.
- Verificación (re-ejecutada por Claude antes de entregar, no asumida): test nuevo 4/4 ✅, suite completa Vitest **693 passing, 1 todo, 694 total** (71 archivos) ✅, `npm --workspace web run check-types` ✅, `eslint` sobre los 5 archivos modificados sin errores ✅, `git diff --check` limpio ✅.
- Navegador: `/login` en desktop y móvil (pantalla directa al email, sin SSO) ✅; Forgot Password → formulario real → Back sin romper estado ✅ (no se completó el envío real del email para no disparar una operación externa); página pública de RGM en viewport móvil (375×812) ✅; CTA sticky móvil "Reservar clase" → selector con las 6 clases reales (incluidas "Graduación"/"Open Mat" sin horario, mostradas sin crash) → "Jiu Jitsu Avanzado" (Mon 19:00–20:30) → modal correcto pidiendo login/registro ✅. Sin errores en consola ni en logs del servidor.
- Sin tocar los untracked ajenos `apps/web/app/api/claim/request/` y `apps/web/app/claim/page.tsx` (confirmado antes y después).
- **No verificado todavía (fuera del alcance de este lote):** rama real `hasFreeTrialCls: true` con clases `isTrial`, reserva completada con sesión autenticada real, y el ciclo de registro con correo real (confirmación + login). Ver `docs/PROJECT-AUDIT.md` para el estado por lote y el veredicto pendiente de Codex.

### Sesión 74 — 2026-07-19 ✅ (mergeada a `main`, PR [#15](https://github.com/MartialOneOnline/martial-v2/pull/15))
**Privacy + Settings: sustituir interacciones falsas por acciones reales** — rama `fix/my-privacy-settings-real-actions`.

**Nota de reconciliación:** esta tarea corrió en dos sesiones de Claude Code en paralelo sobre el mismo directorio compartido (misma rama, mismo nombre de migración) — colisión detectada a mitad de sesión vía `git status`/`ps aux`, no un accidente de una sola sesión. Una de las dos sesiones (esta) reconcilió el resultado final: eliminó la carpeta de migración duplicada nunca aplicada, revisó/corrigió el resto de archivos ya escritos por la otra sesión (incl. un bug real: la copia de confirmación de "Delete account" decía que se borrarían bookings/membership history, cuando la implementación real las conserva — anonimiza, no borra — corregido en EN/ES/PT/FR) y verificó todo de nuevo desde cero.

- Schema: `User.deletedAt` y cuatro preferencias de notificaciones persistentes en `UserPreference`; Prisma Client regenerado. Migración `20260719083841_add_account_deletion_and_notification_prefs` generada, **aplicada a Supabase** (`prisma migrate status` limpio, 26 migraciones) — junto con dos migraciones de la Sesión 73 (`gettingStartedDismissedAt`, `SchoolStatus.UNDER_REVIEW`) que ya estaban aplicadas en la DB compartida pero solo vivían en `feature/getting-started-checklist`, nunca mergeada a `main` — traídas aquí (solo migración + campo de schema, no el resto de esa feature) para que `prisma migrate dev` no pidiera un reset.
- `GET /api/my/export`: descarga JSON del propio usuario con perfil, reservas, membresías y transacciones.
- `DELETE /api/my/account`: anonimiza PII conservando historial/FKs, elimina el usuario de Supabase Auth y después desacopla `supabaseAuthId`.
- `GET/PATCH /api/my/preferences`: preferencias por usuario con allowlist estricta de cuatro booleanos; la UI usa persistencia server-side con actualización optimista y rollback ante error.
- `/my/privacy`: exportación y borrado reales; enlaces a `/legal/privacy`, `/legal/terms`, `/legal/cookies`; analytics deshabilitado hasta que exista una implementación real. Copia de anonimización corregida en EN/ES/PT/FR (ver nota de reconciliación arriba).
- `/my/settings`: eliminado `localStorage`; dark mode queda deshabilitado con “Coming soon” porque no existe sistema de temas. Las preferencias no gatean emails transaccionales; no existe aún un sistema de reminders/promos que las consuma.
- Páginas legales públicas con texto placeholder explícito, sin inventar contenido jurídico, localizadas EN/ES/PT/FR.

**Segunda ronda — auditoría manual del usuario sobre el resultado de arriba, 6 hallazgos, todos confirmados leyendo el código antes de tocar nada:**
- **P1 — cuenta anonimizada pero aún autenticable si falla el borrado en Supabase Auth**: `deletedAt` no se comprobaba en ningún guard. Cerrado en dos capas: (1) `resolveDbUser()`/`getAuthUser()` en `lib/auth/server.ts` (usado por `/dashboard/**`, `/my/layout.tsx` y ~60 rutas) ahora devuelve `null` si `deletedAt` está seteado, aunque la sesión de Supabase siga siendo técnicamente válida; (2) las 4 rutas `/api/my/**` de esta feature (`route.ts`, `account`, `export`, `preferences`) repiten el mismo check inline, ya que no usan `getAuthUser()`. Además, `DELETE /api/my/account` ahora hace *ban* (`auth.admin.updateUserById(..., { ban_duration: '876000h' })`) como fallback si `deleteUser` falla, para bloquear el login en el origen y no depender solo de que cada ruta futura recuerde comprobar `deletedAt`.
- **P1 — la foto de perfil no se borraba de Storage**: el borrado ponía `avatarUrl = null` en la fila pero dejaba el archivo real en el bucket público `avatars` (ruta `avatars/{supabaseAuthId}.{ext}`, ver `apps/web/app/my/profile/page.tsx`). Ahora `DELETE /api/my/account` borra el archivo (best-effort, no bloqueante) antes de anonimizar.
- **P1/P2 — "Download my data" no exportaba todo lo prometido**: el export solo incluía bookings/memberships/transactions. Ampliado a `eventBookings`, `campBookings`, `reviews`, `schoolMembers`, `gradings`, `userWaivers`, `contentAccesses`, `loginHistory` — excluidas deliberadamente las relaciones donde el usuario aparece actuando sobre datos de OTRA persona (`gradingsGiven`, `resolvedTransactions`, `impersonationsAsActor`, `leads`/`leadNotes`/`sentInvitations`) para no filtrar datos de terceros en el export de un usuario.
- **P2 — el toggle de analytics mentía**: aparecía encendido/verde/deshabilitado con copy real ("Help improve the app anonymously") sin que exista ningún sistema de analytics. Cambiado a apagado + copy "coming soon" en los 4 idiomas, mismo patrón que dark mode.
- **P2 — tests insuficientes para el riesgo real**: añadidos casos para cuenta ya anonimizada + sesión viva (401/404 en las 4 rutas + `resolveDbUser` directamente), borrado del avatar con la key exacta, fallback de ban cuando falla `deleteUser`, y que `supabaseAuthId` solo se limpia tras un borrado real (no tras un ban).
- **P3 — carrera en los toggles de notificaciones**: dos clics rápidos podían mandar dos PATCH que resolvían fuera de orden. Cada toggle ahora se deshabilita mientras su propio PATCH está en vuelo (`pendingKeys` en `settings/page.tsx`).
- Corrección menor: el recuento de tests reportado como "641/641" era impreciso — el resultado real de Vitest siempre fue "N passing | 1 todo (N+1 total)".
- Verificación tras ronda 2: `prisma validate` ✅, `check-types` ✅, lint 232 warnings (baseline) ✅, Vitest **653 passing, 1 todo, 654 total** (65 archivos) ✅.

**Tercera ronda — nueva auditoría manual, 5 hallazgos, todos confirmados leyendo el código antes de tocar nada:**
- **P1 — el gate de `deletedAt` de la ronda 2 no cubría toda la superficie**: `resolveDbUser()`/`getAuthUser()` es el chokepoint real de `/dashboard/**` y de las 4 rutas de esta feature, pero **13 rutas más** (`/api/my/bookings`, `/api/my/bookings/[id]`, `/api/my/checkout`, `/api/my/events/*` ×3, `/api/my/memberships/*` ×2 handlers, `/api/my/payments`, `/api/my/school-classes`, `/api/my/school-plans`, `/api/my/stripe-portal`, `/api/bookings`, `/api/memberships/trial`) duplicaban el patrón inline de Supabase sin comprobar `deletedAt` en absoluto. Cerrado migrando las 12 primeras a `getAuthUser()` (mismo chokepoint que ya usa el dashboard) y añadiendo un check inline en `/api/memberships/trial` (semántica get-or-create, no puede usar el helper tal cual). 6 archivos de test tenían un caso "404 cuando la fila no existe" que ahora es 401 (comportamiento correcto y consistente con el resto de usos de `getAuthUser()` en el repo) — actualizados, más un caso nuevo por ruta para cuenta anonimizada con sesión viva.
- **P1/P2 — limpieza de avatar seguía siendo incompleta**: adivinaba la extensión a partir de `avatarUrl` (`avatars/{id}.{ext}`), dejando huérfano cualquier archivo de una extensión anterior (el input acepta `image/*` sin validar). Cambiado a `storage.list('avatars', { search: supabaseAuthId })` + `remove()` de todo lo que aparezca, sin adivinar nada. Además, ya no se declara éxito silencioso si falla: la respuesta incluye `warnings: ['avatar_cleanup_incomplete']` cuando la limpieza no se pudo confirmar (la anonimización y revocación de login no dependen de esto, pero el caller ya no puede pensar que todo se completó).
- **P2 — el fallback de ban no liberaba el email real en Supabase**: si `deleteUser` fallaba y el ban funcionaba, nuestra DB liberaba el email real (columna `email` anonimizada) pero Supabase Auth seguía reteniendo ese email en la cuenta baneada — un reintento de registro con ese email habría fallado igual. Ahora, tras un ban exitoso, se llama también `updateUserById(..., { email: anonymizedEmail })`; si eso también falla, se reporta como `warnings: ['original_email_not_released']` sin bloquear la respuesta 200.
- **P1 — la anonimización no tocaba PII fuera de `User`** (`SchoolMember.medicalNotes`/`emergencyContact`/`notes`, `LoginHistory.userEmail`/`userName`/IP, `UserWaiver.signature`/`ipAddress`, datos en `Lead`): confirmado, y a diferencia de los hallazgos anteriores esto no era un bug técnico sino una decisión de política de retención — se preguntó explícitamente al usuario categoría por categoría en vez de decidir unilateralmente. **Política decidida (2026-07-19):** Waivers (firma/IP), SchoolMember (notas médicas/contacto emergencia) y LoginHistory se **conservan tal cual** — prueba de consentimiento legal, relevancia ante incidentes de seguridad, y auditoría de fraude respectivamente (LoginHistory ya está diseñado en el propio schema para sobrevivir al borrado). `Lead` es la única excepción — datos de marketing/CRM sin razón legal para persistir — `DELETE /api/my/account` ahora anonimiza `name`/`email`/`phone` de cualquier `Lead` con `convertedUserId` apuntando a este usuario, dentro de la misma transacción. `LeadNote` (texto libre de staff) se deja igual que `SchoolMember.notes`, mismo criterio.
- **P2 — el export seguía sin los campos de las categorías que sí se conservan**: no aplica cambio — dado que esos campos se conservan por diseño (no se borran), no hay razón para añadirlos al export tampoco; el alcance del export ya reflejaba correctamente qué es "datos del alumno exportables" vs "registros que la escuela retiene".
- Verificación final: `prisma validate` ✅, `check-types` ✅, lint 232 warnings (mismo baseline) ✅, Vitest **663 passing, 1 todo, 664 total** (65 archivos) ✅. Sin commit todavía.

**Cuarta ronda — corrección incremental sobre el delta pendiente (instrucción explícita del usuario, sin repetir auditorías/migraciones/tests ya cubiertos):**
1. **Gate `deletedAt` en las rutas de auth restantes** — revisadas y clasificadas las 6 señaladas:
   - `/api/auth/activate-member` y `/api/auth/me` → migradas a `getAuthUser()` (duplicaban a mano exactamente la misma lógica de lookup-por-supabaseAuthId-con-fallback-a-email-y-auto-link que ya vive ahí).
   - `/api/admin/me` → migrada también a `getAuthUser()`; de paso corrige un bug preexistente sin relación (`where: { id: user.id }` comparaba el UUID de Supabase contra el cuid de Prisma, así que el endpoint no autenticaba nunca a nadie — 0 callers en todo el repo, `app/admin/layout.tsx` ya usa `getAuthUser()` directamente para el gate real de SUPERADMIN).
   - `/api/schools/[slug]/join` → check inline (semántica get-or-create, mismo patrón que `/api/memberships/trial`).
   - `/api/schools/[slug]/membership-check` → check inline, pero *suave*: una cuenta borrada se trata como si no tuviera cuenta V2 (mismo shape de respuesta que "nunca se unió"), sin 401 — es una lectura de solo-lectura sobre datos propios que de todas formas se conservan (política de SchoolMember de la ronda 3), no una mutación.
   - `/api/claim/[id]` → **sin cambios, deliberado**: no hay ningún `supabase.auth.getUser()` en esta ruta — crea una cuenta de Supabase nueva vía `admin.createUser()` a partir del email de la invitación, nunca confía en una sesión existente del caller. El único posible re-link es por email exacto, y el email real de una cuenta autoborrada ya no vive en `User.email` (se sobrescribió en la misma transacción que puso `deletedAt`) — el gate ya es estructuralmente innecesario aquí.
   - Tests: `activateMember.test.ts` actualizado (el mock de `prisma.user.findFirst` ya no existe en la ruta, ahora usa `findUnique` vía `getAuthUser()`) + caso nuevo de cuenta borrada; 2 archivos de test nuevos, pequeños y enfocados solo en el gate (`authMeAndAdminMeDeletedAtGate.test.ts`, `schoolsJoinAndMembershipCheckDeletedAtGate.test.ts`), reutilizando el patrón `vi.mock('@/lib/auth/server', ...)` ya establecido en `activeContextContextsRoute.test.ts` para las dos rutas migradas a `getAuthUser()`.
2. **Limpieza de avatar — match exacto y fail-closed**: `storage.list(..., { search })` hace un match laxo (substring), no iba a ser exacto solo por confiar en `search` — ahora se post-filtra con `^${supabaseAuthId}\.[^.]+$` antes de borrar nada, así que un archivo ajeno que solo contenga el UUID como substring nunca se toca. Además, **cambio de comportamiento respecto a la ronda 3**: si `list()` o `remove()` fallan, la ruta ahora aborta completamente *antes* de tocar la transacción de anonimización — ya no hay `warnings: ['avatar_cleanup_incomplete']` con 200; es un 502 y nada se ha modificado todavía, así que la operación es reintentable sin dejar un estado a medias.
3. **`updateUserById` combinado**: confirmado en los tipos de `@supabase/auth-js` (`AdminUserAttributes` incluye `email` y `ban_duration` en la misma interfaz) — el fallback de ban ahora hace una sola llamada con ambos campos en vez de dos llamadas separadas, eliminando la ventana donde una podía tener éxito y la otra fallar por separado.
- Verificación final (cuarta ronda): `prisma validate` ✅, `check-types` ✅, lint **230 warnings** (2 menos que el baseline de 232 — limpieza incidental de imports/código muerto al migrar a `getAuthUser()`, no una regresión) ✅, Vitest **673 passing, 1 todo, 674 total** (67 archivos) ✅.
- Trabajo ajeno no tocado en ninguna ronda: `apps/web/app/api/claim/request/`, `apps/web/app/claim/page.tsx`.

### Sesión 73 — 2026-07-18 ✅ (rama actualizada con `main`, PR abriéndose)
**Getting Started checklist en el dashboard** — implementado inicialmente directo sobre `main` (a petición inicial del usuario en el chat, antes de decidir aislarlo), luego movido a la rama nueva `feature/getting-started-checklist` y commiteado ahí (`9e19f36`, `4d89fc8`). Se dejó sin tocar el trabajo ajeno en curso (`apps/web/app/api/claim/request/`, `apps/web/app/claim/page.tsx`, untracked). La rama estuvo 3 commits por detrás de `main` (Sesiones 72 y 74 mergeadas mientras tanto) — reconciliada ahora vía `git merge main`, conflictos solo en `CONTEXT.md` y una línea de `prisma/schema.prisma` (los dos campos nuevos de `UserPreference` de cada rama coexisten sin problema), 4 archivos generados de Prisma resueltos regenerando el cliente. Las dos migraciones de esta sesión (`gettingStartedDismissedAt`, `SchoolStatus.UNDER_REVIEW`) ya habían llegado a `main` vía el PR de la Sesión 74 (estaban aplicadas en la DB compartida pero solo vivían aquí) — el merge las reconoce como ya presentes, sin duplicar nada.

**Motivación:** el dashboard de una escuela recién registrada (`CLAIMED`) muestra ceros reales (0 alumnos, 0 clases, €0) sin ninguna guía para ponerla en marcha. Se diseñó primero un mockup interactivo vía Artifact (iterado con el usuario antes de tocar código real) y luego se planificó/implementó en modo plan.

- **6 pasos, en este orden, cada uno derivado de datos reales (no de un flag marcado a mano):** perfil de la escuela (`city`+`country`) → clases (`Class.count`) → memberships (`MembershipPlan.count` — plantilla de plan, no las suscripciones individuales de `Membership`) → método de pago (claves de Stripe o Revolut guardadas) → alumnos (`SchoolMember.count` role `STUDENT`, sin filtrar por status para que una invitación pendiente ya cuente) → resto de settings (sin señal propia — se marca hecho automáticamente cuando los 5 anteriores lo están, es un empujón final, no una puerta).
- **Auto-promoción de estado:** al completarse los 5 pasos reales, `apps/web/app/api/dashboard/stats/route.ts` sube `School.status` de `CLAIMED` a `UNDER_REVIEW` (no `VERIFIED` directamente — un commit posterior de esta misma rama, `4d89fc8`, añadió ese estado intermedio para que la aprobación final requiera revisión de un admin, no auto-otorgada) con un `updateMany` condicionado a `status: 'CLAIMED'` (nunca pisa `SUSPENDED`/`ARCHIVED`/`PARTNER` puestos a mano por un superadmin).
- **Dismiss persistente:** campo nuevo `UserPreference.gettingStartedDismissedAt` (migración `20260718070147_add_getting_started_dismissed_at`), leído vía `/api/auth/me` (ya se llamaba en cada carga del dashboard, así que no añade un fetch nuevo) y escrito por el endpoint nuevo `POST /api/dashboard/getting-started/dismiss`.
- **Sin fetch nuevo para 4 de los 6 pasos** — el componente nuevo `GettingStartedChecklist.tsx` (montado en `DashboardClient.tsx`, justo debajo de las stat cards, visible solo para roles OWNER/ADMIN) consume datos que ya se cargaban: `/api/dashboard/stats` (extendido con el conteo de `membershipPlan`/`schoolMember` y el objeto `gettingStarted`) y el perfil de escuela ya presente en el estado del dashboard. Sigue la convención real de estilos del archivo (`style={{}}` inline con hex tal cual, `#0071E3`, no el `#0870E2` del mockup standalone).
- **i18n:** namespace nuevo `dashboard.gettingStarted` en las 4 secciones de idioma de `lib/i18n/translations.ts` (EN/ES/PT/FR).
- **Regresión de test detectada y corregida:** `__tests__/dashboardReportAuthGuards.test.ts` mockea `prisma` modelo por modelo; le faltaba `membershipPlan` y rompía con la query nueva — se añadió al mock genérico (`makeModel()`), sin tocar el código de la ruta.
- **Sin verificar en navegador esta sesión ni en la reconciliación** — queda como pendiente explícito en "Próximos pasos": probar el flujo completo (crear clase/plan/pago/alumno uno a uno) contra un school sandbox real.
- **Limpieza colateral:** se encontró y eliminó una rama/worktree vacía `codex/getting-started-checklist` (`/private/tmp/martial-v2-getting-started`) creada por accidente — confirmado que estaba exactamente en el mismo commit que `main`, sin diffs ni cambios sin commitear, antes de borrarla.
- **Archivos nuevos:** `apps/web/app/dashboard/GettingStartedChecklist.tsx`, `apps/web/app/api/dashboard/getting-started/dismiss/route.ts`, `prisma/migrations/20260718070147_add_getting_started_dismissed_at/`, `prisma/migrations/20260718085918_add_school_under_review_status/`.
- Verificación tras el merge de reconciliación: ver "Verificación" en el commit de merge — mismos comandos que las rondas anteriores (`vitest`, `check-types`, `eslint`, `prisma validate`).

### Sesión 72 — 2026-07-18 ✅ (mergeada a `main` en `917e6f6`)
**Verificación de email obligatoria en registro self-serve + auditoría de seguridad de la misma feature en la misma sesión** — vivió en la rama `fix/email-verification-gate`, ya mergeada. El usuario pidió explícitamente no trabajar sobre `main` y aislar del trabajo ajeno en curso (`apps/web/app/api/claim/request/`, `apps/web/app/claim/page.tsx` — presentes como untracked desde el inicio de la sesión, nunca tocados; y, en paralelo, otra sesión de Claude Code trabajando en `feature/getting-started-checklist` sobre el mismo directorio compartido — tampoco tocada).

**Bug original reportado:** una escuela se registró sin verificar el email y aterrizó directo en `/dashboard`. Causa: `apps/web/app/api/auth/register/route.ts` tenía `AUTO_CONFIRM_EMAIL = true` hardcodeado — confirmaba el usuario de Supabase al instante y el cliente hacía auto-login, sin gate ninguno (ni en `proxy.ts` ni en los layouts).

**Parte 1 — la feature (implementada primero, directamente sobre `main`, luego movida a la rama):**
- `email_confirm: false` en `admin.createUser`, sin auto-login. `generateLink({type:'magiclink'})` + envío propio vía Resend (`lib/email/templates/confirmEmail.ts`, `lib/email/sendConfirmEmail.ts`) — mismo patrón que el flujo de invitación (`members/invite/route.ts`).
- Páginas nuevas: `/auth/confirm` (redime el hash, reusa `resolveLoginRedirectAction()` de `login/page.tsx` para no romper el cookie `currentSchoolId` que necesitan los ~56 endpoints de `/api/dashboard/**`) y `/auth/verify-pending` (estado + reenvío).
- `proxy.ts` gatea `email_confirmed_at` en `/dashboard`, `/my`, `/admin` y sus APIs.
- **Hallazgo colateral durante la verificación en navegador real:** `layout.tsx`'s `resolveAuthHashRedirect()` (inline script pensado solo para el flujo de invitación) interceptaba *cualquier* página con `type=magiclink` en el hash, incluida `/auth/confirm` — la mandaba a `/auth/set-password` antes de que su propio código corriera. Fix: la función ahora recibe `pathname` y solo actúa cuando `pathname === '/'` (su intención original ya documentada en el comentario del archivo), sin tocar el comportamiento del flujo de invitación. Test de regresión nuevo en `authHashRedirect.test.ts`.
- Verificado end-to-end con cuentas de prueba reales contra Supabase/Resend/Prisma (creadas y borradas dentro de la sesión): registro → email sin confirmar → redención del link → `email_confirmed_at` seteado + dashboard con datos reales → login bloqueado con Supabase devolviendo `Email not confirmed` (el toggle "Confirm email" del proyecto está activo) → reenvío funcionando.

**Parte 2 — auditoría de seguridad de esa misma feature, aplicada en la misma sesión, en la rama nueva:**
1. **P1 — `resend-confirmation` como canal de login sin contraseña:** el endpoint generaba un magiclink para *cualquier* email existente, incluido uno ya confirmado — eso es login sin contraseña disfrazado de "reenviar confirmación". Fix: `admin.auth.admin.getUserById(supabaseAuthId)` antes de generar nada; solo actúa si `email_confirmed_at` es `null`. Respuesta siempre `{ok:true}` para email inexistente/inválido/ya-confirmado/rate-limited — indistinguibles a propósito (anti-enumeración). Rate limiting nuevo (`lib/rateLimit.ts`, in-memory best-effort, documentado como no apto para multi-instancia sin Redis) por IP (20/hora) y por email (5/hora).
2. **P2 — `?redirect=` no sobrevivía el viaje registro→email→confirm:** `lib/authConfirmRedirect.ts` (nuevo) — `safeConfirmRedirect()` envuelve el `safeRedirect()` ya existente y añade guard de loop contra `/auth/**`. Re-saneado server-side en `register/route.ts` y `resend-confirmation/route.ts` (nunca se confía en el valor ya saneado por el cliente), embebido en el `redirectTo` del `generateLink`, leído por `/auth/confirm` desde `?redirect=` de su propia URL.
3. **P2 — falsos "email enviado":** `sendConfirmationLink()` ahora devuelve `{sent: boolean}` real (no se ignora); la respuesta de `/api/auth/register` incluye `emailSent`. La cuenta **nunca se revierte** por un fallo de envío (ya está creada, es un hecho consumado) — `register/page.tsx` muestra un estado distinto ("cuenta creada, no pudimos enviar el email") con botón de reenvío cuando `emailSent === false`. El endpoint de reenvío en sí sigue devolviendo siempre `{ok:true}` (no puede romper el anti-enumeración de arriba) — la copia del botón tras usarlo es deliberadamente no-comprometida ("si ese email necesita confirmación, va en camino") en vez de un "Email sent" categórico.
4. **P2 — i18n:** namespace nuevo `authVerify` en `lib/i18n/translations.ts` (EN/ES/PT/FR) para todo el texto nuevo de `/auth/confirm`, `/auth/verify-pending`, el mensaje de "email no confirmado" en `login/page.tsx`, y el estado `checkEmail` de `register/page.tsx` (antes hardcodeado en inglés). `register/page.tsx`/`login/page.tsx` no tenían `LanguageContext` antes de esto — se añadió `useT()` solo para el texto nuevo, sin migrar el resto de esas páginas (fuera de alcance).
5. **Limpieza propia detectada en revisión:** `/auth/verify-pending` tenía un parámetro `?sent=0` sin ningún caller real (código muerto) — eliminado antes del commit.
- **Archivos nuevos:** `lib/rateLimit.ts`, `lib/authConfirmRedirect.ts`, `lib/email/templates/confirmEmail.ts`, `lib/email/sendConfirmEmail.ts`, `app/api/auth/resend-confirmation/route.ts`, `app/auth/confirm/page.tsx`, `app/auth/verify-pending/page.tsx`.
- **631 tests pasando** en la rama (61 archivos, +48 sobre los 583 de referencia — 8 `proxyEmailConfirmedGate` + 7 `authConfirmRedirect` + 4 `rateLimit` + 14 `resendConfirmationRoute` + 15 `registerRouteEmailConfirmation`), `check-types` limpio.
- **Cobertura no duplicada a propósito:** el destino tras confirmar por rol (estudiante/owner/múltiples contextos/superadmin) ya está cubierto por los tests existentes de `resolveLoginRedirectAction()` (`loginRedirectLogic.test.ts`) — `/auth/confirm` reusa esa misma función sin lógica propia, así que no se duplicó esa matriz. Sin test de componente para `/auth/confirm`/`/auth/verify-pending` — mismo criterio que todas las sesiones anteriores (sin `@testing-library/react` en el repo); su lógica de decisión (saneo de redirect) sí está cubierta vía `authConfirmRedirect.test.ts`.
- **Riesgos/decisiones abiertas (ya mergeado, cerrados o sin novedad desde entonces):**
  1. **Confirmar en Supabase (Auth → URL Configuration) que `/auth/confirm` está en la allowlist de redirect URLs** — pendiente de confirmación manual, ver "Próximos pasos".
  2. **Rate limiter in-memory, no distribuido** — documentado en el propio archivo (`lib/rateLimit.ts`) como aceptable para el volumen actual, candidato a Redis/Upstash si esto escala.
  3. **Trabajo concurrente detectado:** el directorio principal del repo (`/Users/pablocabo/Projects/martial-v2`) estaba siendo usado por otra sesión de Claude Code (branch `feature/getting-started-checklist`) durante parte de esta sesión — un primer intento de documentar esta sesión escribió `CONTEXT.md` directamente en ese directorio compartido en vez del worktree propio, y quedó capturado en el commit de esa otra rama en vez de en `fix/email-verification-gate`. Corregido re-aplicando la documentación dentro del propio worktree antes de commitear. Lección para el futuro: cualquier archivo compartido (como `CONTEXT.md`) debe editarse dentro del worktree propio, nunca en el checkout principal, si hay trabajo concurrente en curso.

### Sesión 71 — 2026-07-13 ✅
**`/choose-profile` preserva `?redirect=` al exigir login — cierra bug P3 confirmado por auditoría en vivo** — mergeado a `main` en `8672cf1` (branch `fix/choose-profile-login-preserve-redirect`, PR [#13](https://github.com/MartialOneOnline/martial-v2/pull/13), borrada local + remoto tras confirmar Vercel Production). Smoke en producción real confirmó el string exacto verificado antes del merge: `GET /choose-profile?redirect=/my/events` sin sesión → `307` a `/login?redirect=%2Fchoose-profile%3Fredirect%3D%252Fmy%252Fevents`.

Bug confirmado en vivo contra producción: `GET /choose-profile?redirect=/my/events` sin sesión respondía `307` a `/login?redirect=/choose-profile` — el `/my/events` original desaparecía por completo. Causa raíz: `apps/web/app/choose-profile/page.tsx` (línea 22 antes de este fix) tenía `redirect('/login?redirect=/choose-profile')` **hardcodeado como string literal**, ignorando el `?redirect=` real de la request entrante. Distinto del bug ya cerrado en la Sesión 66 (`resolveChooseProfileRedirect()` en `logic.ts`, que preserva el redirect DESPUÉS de elegir contexto) — este PR arregla el momento ANTES: cuando `/choose-profile` mismo exige login.

- **`apps/web/app/choose-profile/page.tsx`** — ahora recibe `searchParams: Promise<{ redirect?: string }>` como prop (patrón Next.js 16 ya usado en `app/checkin/[classId]/page.tsx`: `await searchParams` en vez de `useSearchParams()`, que solo aplica a client components). En la rama `!user`, lee `redirect` de `searchParams` y delega la decisión a la función nueva de abajo antes de llamar a `redirect()`. El resto de la página (guard de `dbUser`, render de `ChooseProfileClient`) sin cambios.
- **`apps/web/app/choose-profile/loginRedirect.ts`** (archivo nuevo) — `resolveChooseProfileLoginRedirect(rawRedirect)`, función pura sin imports de React/next/DOM (mismo criterio que `logic.ts`/`lib/auth/loginRedirect.ts`), contraparte de `resolveChooseProfileRedirect()` pero para el lado del login. No se tocó `logic.ts` (fuera de alcance explícito) — el chequeo de loop hacia `/choose-profile` se reimplementó localmente (duplicando `pathnameOf()`, ~4 líneas) porque `logic.ts` no exporta ese helper. Reglas: (1) sin `redirect`, o `safeRedirect()` lo rechaza (host externo, `//`, `javascript:`, malformado) → fallback `/login?redirect=/choose-profile` (comportamiento idéntico al anterior); (2) el redirect seguro resuelve a `/choose-profile` (con o sin su propio query string) → mismo fallback, sin loop; (3) en cualquier otro caso → `/login?redirect=${encodeURIComponent('/choose-profile?redirect=' + encodeURIComponent(safe))}`.
- **Encoding verificado con roundtrip real, no solo por inspección** — para `safe = '/my/events'`, la función produce exactamente `/login?redirect=%2Fchoose-profile%3Fredirect%3D%252Fmy%252Fevents`. Confirmado con un script de Node que simula el pipeline completo: `new URLSearchParams(...).get('redirect')` sobre esa URL (lo que hace `login/page.tsx`'s `searchParams.get('redirect')` de verdad, vía Next `useSearchParams()`) decodifica exactamente una vez y devuelve `/choose-profile?redirect=%2Fmy%2Fevents` — que pasa `safeRedirect()` del lado de login sin ser rechazado (empieza por `/`, no por `//`) y se usa tal cual en `router.push()`. Al aterrizar ahí, el `searchParams` (server-side, Next 16) de `/choose-profile` decodifica una vez más y recupera `/my/events` intacto. Doble `encodeURIComponent` necesario porque el valor intermedio contiene un `?` y un `=` literales que de otro modo romperían el parseo del query string externo de `/login`.
- **Archivo nuevo dentro del scope permitido** (`apps/web/app/choose-profile/loginRedirect.ts`) — explícitamente autorizado por el ticket ("si creas un archivo nuevo, mantente dentro del directorio `apps/web/app/choose-profile/`"). No se tocó `ChooseProfileClient.tsx`, `logic.ts` (solo se leyó, no se modificó ni se le importó nada), `/api/auth/context/select`, `/api/auth/contexts`, `/api/my/**`, `login/page.tsx`/`LoginModal.tsx`/`loginRedirect.ts` (el de `lib/auth/`, no confundir con el archivo nuevo homónimo en `choose-profile/`), APIs de dashboard, ni schema/migraciones.
- **Tests**: `apps/web/__tests__/chooseProfileLoginRedirect.test.ts` (nuevo, 9 casos) para `resolveChooseProfileLoginRedirect()` — sin redirect (`undefined`/`null`/`''`) → fallback; `/my/events` y `/dashboard` → destino envuelto con el encoding exacto verificado arriba; query string anidada (`/my/events?tab=upcoming`) preservada completa; `https://evil.com` y `//evil.com` → fallback; `/choose-profile` y `/choose-profile?foo=bar` → fallback sin loop; test de roundtrip explícito simulando la decodificación de `URLSearchParams` en ambos extremos (login y choose-profile). `apps/web/__tests__/chooseProfilePageGuard.test.ts` actualizado: el helper `callPage()` ahora pasa `searchParams: Promise.resolve(...)` (antes llamaba `ChooseProfilePage()` sin argumentos, lo que ahora rompería el destructuring de la nueva prop); casos nuevos para "sin sesión + `?redirect=/my/events` válido" y "sin sesión + `?redirect=https://evil.com` inválido → fallback"; los casos "con sesión" y "sin `?redirect=` en absoluto" quedan como regresión explícita, sin cambios de comportamiento.
- **582 tests pasando** en total (56 archivos, +11 sobre los 571 de la Sesión 70 — 9 del archivo nuevo + 2 casos nuevos en el guard test), `check-types` limpio, `lint` **231 warnings — mismo conteo exacto que `main`, sin ninguna nueva** (verificado explícitamente, mismo criterio que sesiones previas de esta serie tras el incidente de import sin usar de la Sesión 67), `prisma validate` en verde.
- **Sin verificación visual** — este fix es 100% de una redirección server-side sin superficie de UI nueva (mismo criterio que las Sesiones 66/68/69: sin `@testing-library/react` en el repo, cubierto por tests unitarios de la función pura + el test del guard del server component).
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **Chequeo de loop duplicado, no compartido con `logic.ts`** — `pathnameOf()`/el chequeo de prefijo `/choose-profile` viven ahora en dos archivos (`logic.ts` para el redirect POST-selección, `loginRedirect.ts` para el PRE-login) porque `logic.ts` estaba fuera de alcance para este PR y no exporta esos helpers. Candidato a refactor futuro (extraer a un tercer archivo compartido) si un tercer caso de uso aparece, pero no justifica tocar `logic.ts` solo por esto.

### Sesión 70 — 2026-07-13 ✅
**Menú lateral del dashboard en mobile se cierra automáticamente al navegar** — mergeado a `main` en `cf6d7ac` (branch `fix/mobile-sidebar-close-on-nav`, PR [#12](https://github.com/MartialOneOnline/martial-v2/pull/12), borrada local + remoto tras confirmar Vercel Production y smoke test de `/`, `/dashboard`).

Bug de UX (no de auth, distinto de la serie de PRs P1-P3 de Sesiones 66-69): en `apps/web/components/DashboardSidebar.tsx`, el componente interno `NavGroup` renderizaba los `<Link>` finales (items de nivel superior sin `children`, y los de dentro de un submenu ya expandido) sin ningún `onClick` que cerrara el menú — `menuOpen`/`setMenuOpen` vive en `DashboardShell.tsx` y ya se pasaba como prop a `DashboardSidebar`, pero `NavGroup` no lo recibía. En mobile, tocar un link de navegación dejaba el overlay + el propio menú abiertos tapando la pantalla hasta que el usuario tocaba la X o el fondo a mano.

- **Mecanismo elegido: `onClick` directo en cada `<Link>`, no `useEffect` sobre `usePathname()`** — mismo patrón que ya usa `apps/web/components/MyShell.tsx#SidebarContent` (que ya estaba correcto, no se tocó): sus `<Link>` reciben `onClick={onClose}` donde `onClose` es `() => setDrawerOpen(false)` en el drawer mobile y `undefined` en el `<aside>` de desktop. Se prefirió el `onClick` explícito sobre un efecto de pathname porque es más local (no necesita un nuevo `useEffect` ni dependencia añadida al render), no dispara nunca en el primer render (un efecto sobre pathname se ejecuta también al montar), y es el precedente ya establecido en este mismo repo.
- **`apps/web/components/DashboardSidebar.tsx`** — `NavGroup` ahora recibe `setMenuOpen` como prop nueva (`{ item, setMenuOpen }: { item: NavItem; setMenuOpen: (v: boolean) => void }`). Se añadió `onClick={() => setMenuOpen(false)}` a los dos `<Link>` que navegan: el de nivel superior sin `children` (antes línea 35) y el de dentro de `item.children` ya expandido (antes línea 96). El botón toggle de submenú (`<button onClick={() => setOpen(v => !v)}>`) **no se tocó** — no navega, solo expande/colapsa, y cerrar el menú ahí habría sido un bug nuevo. Las dos llamadas a `<NavGroup key={item.label} item={item} />` (una para `NAV_MAIN`, otra para `NAV_BOTTOM`) se actualizaron a `<NavGroup key={item.label} item={item} setMenuOpen={setMenuOpen} />`. Sin `setTimeout`/`setInterval` — el cierre es una reacción directa al evento de click. Sin `preventDefault()` — la navegación nativa del `<Link>` (incluido Cmd/Ctrl+click para abrir en pestaña nueva) queda intacta, solo se añade la llamada a `setMenuOpen(false)` al handler existente.
- **`apps/web/components/DashboardShell.tsx` no necesitó cambios** — ya pasaba `setMenuOpen` a `DashboardSidebar` como prop desde antes; el único cambio fue que `DashboardSidebar` empezara a reenviarlo a `NavGroup`.
- **La regla CSS de desktop no se tocó** — `@media (min-width: 768px) { .dashboard-sidebar { transform: translateX(0) !important; } }` (línea 197 de `DashboardSidebar.tsx`) sigue forzando el sidebar visible en desktop independientemente de `menuOpen`; cerrar `menuOpen` tras un click en desktop no oculta nada visualmente porque el `!important` de la media query gana siempre.
- **`apps/web/components/MyShell.tsx` NO se tocó** — ya tenía el patrón correcto (`onClick={onClose}` en sus `<Link>`), confirmado leyendo el archivo completo antes de empezar; es el precedente que se imitó, no algo que arreglar.
- **Sin infraestructura de test de componentes React** — `@testing-library/react` sigue sin estar instalado en el repo (confirmado de nuevo con grep, igual que en sesiones previas de esta serie); no se introdujo solo para este PR. Verificación manual documentada en su lugar (ver checklist abajo), sin tests nuevos — **571 tests pasando** (55 archivos), mismo conteo que la Sesión 69 porque no se tocó ninguna lógica de backend/pura testeable con vitest.
- **Checklist de verificación manual (mobile, viewport < 768px):** abrir el menú vía el botón burger → tocar un link de nivel superior sin submenú (p. ej. "Dashboard" o "Users") → el menú se cierra Y navega a la ruta. Abrir el menú de nuevo → tocar el botón de un grupo con submenú (p. ej. "Classes" o "Payments") → el menú **no** se cierra, solo expande/colapsa la sección (sigue abierto). Con el submenú expandido → tocar un link hijo (p. ej. "Calendar" dentro de "Classes") → el menú se cierra Y navega. **Checklist desktop (≥768px):** el sidebar permanece siempre visible sin importar cuántos links se toquen, porque la regla CSS `!important` ignora `menuOpen`.
- `check-types` limpio, `lint` **231 warnings — mismo conteo exacto que `main`, sin ninguna nueva** (verificado explícitamente, mismo criterio que sesiones previas de esta serie tras el incidente de import sin usar), `prisma validate` en verde.
- **Fuera de alcance, no tocado:** auth/contexto/selector de contexto, pagos/memberships/Stripe/Revolut, schema/migraciones, cualquier rediseño de layout más allá del comportamiento de apertura/cierre del menú.
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **Sin verificación automatizada de UI** — la ausencia de `@testing-library/react` en el repo sigue siendo una brecha conocida (documentada en sesiones previas); este PR se apoya solo en verificación manual, sin cobertura de test para este comportamiento específico de cierre de menú.

### Sesión 69 — 2026-07-12 ✅
**Últimos 2 P3 de autorización dashboard cerrados: `classes/today` y `school` GET migrados a `requireDashboardAccess()`** — mergeado a `main` en `13d0936` (branch `fix/dashboard-p3-auth-guards`, PR [#11](https://github.com/MartialOneOnline/martial-v2/pull/11), borrada local + remoto tras confirmar Vercel Production y smoke test de `/`, `/dashboard`, `/api/auth/contexts`).

Nota: el primer intento de smoke test post-merge falló con "Tool permission request failed" — un fallo de la capa Bash/permisos del propio harness antes de que el comando llegara a ejecutarse, no una respuesta HTTP real. Re-ejecutados uno por uno con `curl -v`, los 3 checks pasaron limpio (200/307/401) — producción nunca estuvo en duda, solo el tooling local.

Cierra el riesgo #2 documentado como abierto en la Sesión 68 ("`classes/today` y `school` GET siguen sin el guard reforzado — P3, ya documentado como fuera de alcance explícitamente en esta sesión; candidato a un PR futuro de menor prioridad"): ambos endpoints llamaban `requireSchoolAccess(userId, schoolId)` (`lib/auth/contexts.ts`) y se detenían ahí, igual que los 7 de la Sesión 68 antes de su fix — esa función solo valida `SchoolMember.status === 'ACTIVE'`, nunca `role`. Un `SchoolMember` con rol `STUDENT` y status `ACTIVE` podía llamarlos directamente y leer el roster de clases de hoy (con conteo de reservas) o el payload de configuración de la escuela.

- **Confirmación de callers repetida antes de migrar** (`grep -rn "api/dashboard/classes/today\|api/dashboard/school" apps/web/app apps/web/components apps/web/lib`): solo componentes dashboard-only consumen ambos endpoints — `app/dashboard/DashboardClient.tsx` (ambos), `app/dashboard/settings/SettingsClient.tsx` y `components/popups/EditSchoolModal.tsx` (`school`), `app/dashboard/users/UsersClient.tsx` (`school`, solo para leer `language`). Ningún caller bajo `/my/**` ni público — coincide con la auditoría previa de la Sesión 68, sin sorpresas.
- **`GET /api/dashboard/classes/today`** (`apps/web/app/api/dashboard/classes/today/route.ts`) — reemplazado el bloque `if (user.role !== 'SUPERADMIN') { try { await requireSchoolAccess(...) } catch { 403 } }` por `await requireDashboardAccess(schoolId)` en el mismo try/catch → 403, mismo patrón exacto que `billing/route.ts` (Sesión 68). 401/400 (sin sesión / sin `schoolId`) y la query/forma de respuesta sin cambios. El import de `requireSchoolAccess` de `lib/auth/contexts` se eliminó de este archivo (ya no lo usa).
- **`GET /api/dashboard/school`** (`apps/web/app/api/dashboard/school/route.ts`) — mismo tratamiento en el GET: el bloque que hacía `requireSchoolAccess()` y a la vez servía de guard de entrada y de fuente para `canViewPaymentSecrets` se separó en dos pasos: (1) `requireDashboardAccess(schoolId)` como guard de entrada (403 si falla), devolviendo `{ member }`; (2) `canViewPaymentSecrets = user.role === 'SUPERADMIN' || (member OWNER/ADMIN)` calculado a partir del `member` ya devuelto, sin volver a golpear la DB. El gate de campos de secretos de pago (Stripe/Revolut — solo OWNER/ADMIN ven `*Configured`/`*Masked`, nunca el valor crudo) es el mismo código de antes, intacto, solo movido debajo del nuevo guard de entrada — no se duplicó ni se quitó. `PATCH` de este mismo archivo **no se tocó** — sigue con su propio guard manual `['OWNER','ADMIN']` vía `requireSchoolAccess`, import que se mantiene en el archivo solo por el `PATCH`.
- **22 tests nuevos** en `apps/web/__tests__/dashboardClassesTodayAndSchoolAuthGuards.test.ts` (mismo patrón de mocks que `dashboardReportAuthGuards.test.ts` de la Sesión 68): STUDENT activo → `403` en ambas rutas (con `requireDashboardAccess` invocado con el `schoolId` correcto); cada rol de `DASHBOARD_ROLES` → `200` en ambas; `SUPERADMIN` → `200` sin `SchoolMember` en ambas; sin sesión → `401` en ambas; `school` GET con OWNER → ve `stripeSecretKeyConfigured`/`stripeSecretKeyMasked` (nunca el valor crudo `stripeSecretKey`) y con INSTRUCTOR (rol de `DASHBOARD_ROLES` sin acceso a secretos) → esos mismos campos ausentes, confirmando que el gating de secretos no cambió; regresión explícita `classes` GET (archivo NO tocado) con STUDENT → sigue `200`, sin invocar `requireDashboardAccess`.
- **571 tests pasando** en total (56 archivos, +22 sobre los 549 de la Sesión 68), `check-types` limpio, `lint` **231 warnings — mismo conteo exacto que `main`, sin ninguna nueva** (verificado explícitamente, mismo criterio que la Sesión 68 tras el incidente de import sin usar de la Sesión 67), `prisma validate` en verde.
- **Sin cambios** en `requireDashboardAccess()`/`DASHBOARD_ROLES` (`lib/auth/server.ts`, `lib/auth/contexts.ts` — ambos ya reforzados en la Sesión 68, solo leídos aquí), los 7 endpoints ya migrados en la Sesión 68, `classes` GET (`hasPermission('school.classes.view')`, STUDENT permitido por diseño), `/api/my/**`, el selector de contexto, schema/migraciones, ni ningún componente cliente — un STUDENT nunca monta `DashboardClient.tsx`/`SettingsClient.tsx`/`UsersClient.tsx`/`EditSchoolModal.tsx` gracias al guard de `dashboard/layout.tsx`, así que el nuevo 403 no rompe ningún flujo de UI existente.
- **Sin verificación visual** — este PR es 100% backend (guard de entrada en 2 endpoints ya existentes, misma forma de respuesta), cubierto por los 22 tests unitarios/de ruta de arriba, mismo criterio que la Sesión 68 (endpoints puros de backend sin superficie de UI nueva que probar en preview).
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **~90 rutas restantes de `/api/dashboard/**` no fueron re-auditadas una por una** en esta sesión — el alcance era exclusivamente estos 2 endpoints P3 ya identificados por la Sesión 68; sigue pendiente si se quiere cobertura del 100% de `/api/dashboard/**` (mismo riesgo ya documentado en la Sesión 68, sin nuevos hallazgos en esta sesión).

### Sesión 68 — 2026-07-12 ✅
**7 endpoints GET de `/api/dashboard/**` reforzados con `requireDashboardAccess()` — cierra hallazgo P1/P2 de autorización** — mergeado a `main` en `6412f41` (branch `fix/dashboard-report-auth-guards`, PR [#10](https://github.com/MartialOneOnline/martial-v2/pull/10), borrada local + remoto tras confirmar Vercel Production y smoke test de `/`, `/dashboard`, `/api/auth/contexts`).

Cierra el hallazgo #3 documentado como abierto en la Sesión 67 ("falta de chequeo de rol/pertenencia consistente en varias de las 56/57 rutas de `/api/dashboard/**` más allá de simplemente confiar en `currentSchoolId`"): 7 endpoints GET llamaban `requireSchoolAccess(userId, schoolId)` (`lib/auth/contexts.ts`) y se detenían ahí — esa función solo valida `SchoolMember.status === 'ACTIVE'`, nunca `role`. Un `SchoolMember` con rol `STUDENT` y status `ACTIVE` podía llamarlos directamente y leer datos administrativos: facturación de la escuela, roster completo de miembros con PII (nombre/email/belt/plan), ingresos por transacción individual, listado de ausencias/no-shows por alumno.

- **`requireDashboardAccess(schoolId?)`** (`apps/web/lib/auth/server.ts`) — ya existía (código muerto, ningún caller real; confirmado con `grep -rn "requireDashboardAccess(" apps/web/app` — solo 2 comentarios lo mencionaban, en `activeContextCookie.ts` y `context/select/route.ts`), reforzado: tras `requireSchoolAccess(user.id, sid)`, si `member.role` no está en `DASHBOARD_ROLES` (importado de `contexts.ts`, no redefinido), lanza el mismo `Error('FORBIDDEN')` que ya usaba para el caso "sin schoolId". Bypass de SUPERADMIN y resolución de `schoolId` (param o `getCurrentSchoolId()`) sin cambios. `requireSchoolAccess()` en `contexts.ts` **no se tocó** — sigue siendo la base para los ~90 endpoints que aplican su propio permiso más fino encima (`hasPermission()` o arrays de rol manuales).
- **7 rutas migradas**, mismo patrón en cada una (reemplazado el bloque `if (user.role !== 'SUPERADMIN') { try { await requireSchoolAccess(...) } catch { 403 } }` — o la función local `authorise()` que lo envolvía en los 5 archivos de `reports/*` y `membership-plans/[id]/members` — por una llamada a `requireDashboardAccess(schoolId)`, conservando el 401/400/403 exactos y las queries/forma de respuesta sin cambios):
  - `apps/web/app/api/dashboard/billing/route.ts`
  - `apps/web/app/api/dashboard/stats/route.ts`
  - `apps/web/app/api/dashboard/reports/payments/route.ts`
  - `apps/web/app/api/dashboard/reports/users/route.ts`
  - `apps/web/app/api/dashboard/reports/absents/route.ts`
  - `apps/web/app/api/dashboard/reports/bookings/route.ts`
  - `apps/web/app/api/dashboard/membership-plans/[id]/members/route.ts`
- **Fuera de alcance, explícitamente no tocado:** las ~90 rutas de `/api/dashboard/**` ya protegidas por `hasPermission()`/arrays de rol propios; `classes` GET (usa `hasPermission('school.classes.view')` — `STUDENT` pasa por diseño, no es bug); `classes/today` y `school` GET (P3, ya documentados fuera de alcance); `upload/route.ts` (ya tenía su propio guard correcto `requireSchoolAccess` + `DASHBOARD_ROLES.includes(role)` manual — no migrado, sigue con su propia implementación); `/api/my/**`; todo el selector de contexto (`activeContext.ts`, `activeContextCookie.ts`, `choose-profile/**`, `loginRedirect.ts`); pagos/memberships/Stripe/Revolut fuera de estos 7 archivos; schema/migraciones; UI.
- **21 tests nuevos**: `apps/web/__tests__/requireDashboardAccess.test.ts` (11 — primera cobertura real de esta función, antes sin callers: STUDENT ACTIVE → `FORBIDDEN`; cada rol de `DASHBOARD_ROLES` → pasa; `SUPERADMIN` → bypass sin consultar `SchoolMember`; sin `SchoolMember` → `FORBIDDEN`; rol staff con status no-`ACTIVE` → sigue `FORBIDDEN`) + `apps/web/__tests__/dashboardReportAuthGuards.test.ts` (30 — matriz de las 7 rutas: STUDENT activo → `403` nuevo que antes habría fallado, cada uno con `mockRequireDashboardAccess` invocado con el `schoolId` correcto; rol staff (`OWNER`) → `200`; sin sesión → `401`; `SUPERADMIN` → `200` sin `SchoolMember` en billing + un report; los 6 roles de `DASHBOARD_ROLES` → `200` en billing; regresión explícita `classes` GET con `STUDENT` → sigue `200`, confirmando que esa ruta no se tocó y que no invoca `requireDashboardAccess`).
- **549 tests pasando** en total (56 archivos, +41 sobre los 508 de la Sesión 67 — 11 + 30 de arriba), `check-types` limpio, `lint` **231 warnings — mismo conteo exacto que `main`, sin ninguna nueva** (verificado explícitamente con `git stash` + lint en `main` antes de comparar, tras el incidente de la Sesión 67 donde un import sin usar subió el conteo de 231 a 232), `prisma validate` en verde.
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **`classes/today` y `school` GET siguen sin el guard reforzado** — P3, ya documentado como fuera de alcance explícitamente en esta sesión; candidato a un PR futuro de menor prioridad.
  3. **~90 rutas restantes de `/api/dashboard/**` no fueron re-auditadas una por una** en esta sesión — el alcance era exclusivamente estos 7 endpoints ya identificados por la auditoría previa (Sesión 67); una revisión exhaustiva de las rutas ya protegidas por `hasPermission()`/arrays de rol manuales queda pendiente si se quiere una cobertura del 100%.

### Sesión 66 — 2026-07-12 ✅
**`/choose-profile` ahora consume `?redirect=` de forma segura al elegir contexto** — mergeado a `main` en `ef25598` (branch `fix/choose-profile-redirect-param`, PR [#8](https://github.com/MartialOneOnline/martial-v2/pull/8), borrada local + remoto tras confirmar Vercel Production y smoke test de `/choose-profile`, `/`, `/api/auth/contexts`).

Cierra el riesgo #1 documentado como abierto en la Sesión 65: `lib/studentContext.ts#chooseProfileUrl()` ya construía `/choose-profile?redirect=<path>` cuando `/api/my/**` devolvía `student_context_required` (409), pero `/choose-profile` lo ignoraba por completo — `logic.ts#redirectPathForMode()` siempre mandaba a `/dashboard` o `/my` tras elegir. Un alumno que llegaba a `/choose-profile?redirect=/my/events` (tras un 409 en `/my/events`) elegía su contexto y aterrizaba en `/my` genérico, perdiendo la página original.

- **`app/choose-profile/logic.ts`** — nueva función pura `resolveChooseProfileRedirect(mode, rawRedirect)`, mismo patrón que `redirectPathForMode()`/`classifyContexts()` (sin imports de React/next/DOM, testeable con vitest plano). Reutiliza `safeRedirect()` tal cual (sin tocarlo) para el chequeo "mismo origen, path relativo, no `//`/`https://`/`javascript:`" y añade encima la capa que `safeRedirect()` no conoce — compatibilidad modo↔ruta:
  1. Sin `redirect`, o `safeRedirect()` lo rechaza (host externo, protocol-relative, `javascript:`, etc.) → fallback de siempre (`redirectPathForMode(mode)`, sin cambios).
  2. El redirect (ya seguro) resuelve a `/choose-profile` mismo, con o sin su propio query string (p. ej. `/choose-profile?redirect=/my/events` o `/choose-profile/extra`) → fallback, nunca hace loop de vuelta al selector.
  3. El redirect es seguro y no es loop, pero apunta al portal contrario del modo elegido (`student` → algo bajo `/dashboard`, o `dashboard` → algo bajo `/my`) → fallback. `student` nunca puede terminar en `/dashboard`, `dashboard` nunca puede terminar en `/my`.
  4. En cualquier otro caso (seguro, no-loop, bajo el prefijo del propio modo) → se honra el redirect tal cual, incluyendo su query string si tenía una (p. ej. `/my/events?tab=upcoming`).
  - Prefijos exactos: `/my` permite `/my` y `/my/...` (no `/myfoo`); `/dashboard` permite `/dashboard` y `/dashboard/...` (no `/dashboardfoo`) — comparación por segmento, no por `startsWith` crudo, para evitar colisiones de prefijo.
- **`app/choose-profile/ChooseProfileClient.tsx`** — pasa a leer `useSearchParams()` (el `redirect` param) dentro del componente, que ahora requiere `<Suspense>` (Next.js app router exige boundary para `useSearchParams()`). Mismo patrón ya usado en `app/login/page.tsx` (`LoginPageInner` dentro de `<Suspense>`): el cuerpo del componente se renombró a `ChooseProfileClientInner`, el export default nuevo es un wrapper delgado `ChooseProfileClient` que envuelve `<ChooseProfileClientInner>` en `<Suspense fallback={<ChooseProfileFallback />}>` (spinner mínimo, no duplica el `t.loading` real porque `useT()` no está disponible fuera del árbol de `LanguageContext` en ese punto). `handleSelect()` ahora hace `router.push(resolveChooseProfileRedirect(context.mode, redirectParam))` tras un `POST /api/auth/context/select` exitoso, en vez de `router.push(result.redirectTo)` directo — `selectProfileContext()` (y su `redirectTo`) **no se tocaron**, siguen devolviendo el fallback plano de siempre; la decisión final de a dónde navegar vive en el componente, no en `logic.ts#selectProfileContext()`, para no tener que romper la firma/tests ya existentes de esa función.
- **`page.tsx` no se tocó** — el guard de auth server-side sigue igual (sin sesión → `/login?redirect=/choose-profile`); el `?redirect=` del selector se lee client-side porque la selección de contexto ocurre en `ChooseProfileClient`, no en el server component.
- **`POST /api/auth/context/select` sin cambios** — el redirect post-selección es 100% lógica de cliente, como pedía el ticket.
- **16 tests nuevos** en `chooseProfileLogic.test.ts` para `resolveChooseProfileRedirect()`: student+`/my/events` compatible → honrado; dashboard+`/dashboard/classes` compatible → honrado; student+`/dashboard` y student+`/dashboard/settings` incompatibles → fallback `/my`; dashboard+`/my` y dashboard+`/my/events` incompatibles → fallback `/dashboard`; `https://evil.com` (ambos modos), `//evil.com` y `javascript:...` rechazados por `safeRedirect()` antes del chequeo de modo; `/choose-profile` con y sin query propio, y `/choose-profile/extra` como prefijo → fallback sin loop; sin `redirect` en absoluto (`null`/`undefined`, ambos modos) → comportamiento de siempre; query string preservada en un redirect compatible (`/my/events?tab=upcoming`); colisión de prefijo `/myfoo` no cuenta como bajo `/my`. Los tests existentes de `selectProfileContext()`/`redirectPathForMode()`/`classifyContexts()`/`fetchAvailableContexts()` (incluida la cobertura del mensaje de error de selección 403/400/red) siguen intactos y en verde, sin tocarlos — **503 tests pasando** en total (52 archivos, +16 sobre los 487 de la Sesión 65), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados, ninguno nuevo en `choose-profile/**`) / `prisma validate` en verde.
- **Verificación:** smoke test manual vía `preview_start` — `GET /choose-profile?redirect=/my/events` sin sesión sigue devolviendo `307` a `/login?redirect=/choose-profile` (guard de `page.tsx` intacto, sin excepción de servidor ni de compilación por el nuevo `useSearchParams()`/`<Suspense>`). **Sin verificación visual del selector ya autenticado** (memoria del usuario: prefiere probar cambios de UI él mismo, y este PR no cambia nada visual — solo el destino tras el click) — la lógica de redirect se cubre con los 16 tests unitarios, mismo criterio que las Sesiones 62/65 (sin `@testing-library/react` en el repo).
- **Sin cambios** de `/api/my/**`, APIs de dashboard, `login/page.tsx`/`LoginModal.tsx`/`loginRedirect.ts`, schema/migraciones, pagos/memberships/Stripe/Revolut, ni la cookie/endpoints de `currentSchoolId`.
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **Unificación `martial_active_context` ↔ `currentSchoolId`** — sigue sin resolverse (ver Sesión 61), no relacionado con este PR.
  3. **Gates de `/dashboard/**` por contexto activo** — sigue pendiente (ver Sesión 65), no tocado aquí.

### Sesión 67 — 2026-07-12 ✅
**`POST /api/auth/context/select` sincroniza `currentSchoolId` al elegir contexto `dashboard`** — mergeado a `main` en `c9fbf00` (branch `fix/choose-profile-dashboard-sync`, PR [#9](https://github.com/MartialOneOnline/martial-v2/pull/9), borrada local + remoto tras confirmar Vercel Production y smoke test de `/`, `/choose-profile`, `/api/auth/contexts`). Antes de mergear se corrigió un import sin usar (`CURRENT_SCHOOL_ID_COOKIE_MAX_AGE`) detectado en la revisión — 0 warnings nuevas respecto a `main` confirmado antes del merge.

Cierra un bug ya verificado (auditoría de esta misma sesión, no documentada antes en un `Sesión N` separado): un usuario que elegía un contexto `dashboard` en `/choose-profile` veía el dashboard roto o con datos de la escuela equivocada, porque `POST /api/auth/context/select` (Sesión 61) solo escribía `martial_active_context` y nunca sincronizaba `currentSchoolId` — la cookie que los 57 endpoints de `/api/dashboard/**` realmente leen (vía `getCurrentSchoolId()`/`requireDashboardAccess()` en `lib/auth/server.ts`, endpoint viejo `api/auth/context/route.ts`, sesión histórica no relacionada con el selector). Tras Sesión 61/62/63, `martial_active_context` existía y `/choose-profile` la seteaba, pero ningún endpoint de dashboard la leía nunca — el selector prometía un cambio de contexto que, para el modo `dashboard`, no ocurría de verdad a nivel de datos.

- **`apps/web/app/api/auth/context/select/route.ts`** (único endpoint modificado): tras `isValidContext()` devolver `true` y setear `martial_active_context` (sin cambios ahí), añade una rama `if (context.mode === 'dashboard')`:
  - `prisma.userPreference.upsert({ where:{userId}, create/update:{lastSchoolId: schoolId, lastContextType:'SCHOOL'} })` — mismo upsert exacto que ya hace el endpoint viejo `api/auth/context/route.ts` (no tocado), para que el fallback cross-device (`getUserContexts()` prefiriendo `lastSchoolId`) quede consistente sin importar cuál de los dos endpoints seteó el contexto por última vez.
  - `res.cookies.set('currentSchoolId', schoolId, {...})` con las mismas opciones exactas que ya usa el endpoint viejo (`httpOnly:true, secure: NODE_ENV==='production', sameSite:'lax', maxAge: 60*60*24*7 (7 días), path:'/'`) — **7 días**, deliberadamente distinto de los 60 días de `martial_active_context` (son cookies con TTLs distintos a propósito, no un desajuste a corregir — mismo criterio ya documentado en la Sesión 61 para por qué esta cookie es de larga duración).
  - `mode === 'student'` **no toca `currentSchoolId` en absoluto** — ni la setea ni la limpia. Decisión explícita, documentada in-line en el propio archivo: un usuario eligiendo su perfil de alumno puede tener una sesión de dashboard activa en otra pestaña/rol, y limpiar `currentSchoolId` ahí la tumbaría silenciosamente. `/api/my/**` ya lee `martial_active_context` directamente vía `getActiveStudentContext()` (Sesión 65), así que no hay cookie legacy que sincronizar para ese modo.
  - `DELETE /api/auth/context/select` **no se tocó** — sigue sin limpiar `currentSchoolId`; se documentó in-line por qué: son cookies con ciclos de vida independientes (`DELETE /api/auth/context`, el endpoint viejo, sigue siendo el único que limpia `currentSchoolId`), y unificar sus lifecycles no lo pedía este ticket — hacerlo de rebote arriesgaba tumbar una sesión de dashboard activa sin que el ticket lo pidiera explícitamente.
  - Body inválido (400) o `isValidContext()` en `false` (403) → confirmado que ninguna cookie se setea en ninguno de los dos casos (ni antes ni después de este cambio) — comportamiento ya existente, no alterado.
- **`apps/web/lib/auth/activeContextCookie.ts`** — se añadieron 3 exports pequeños (`CURRENT_SCHOOL_ID_COOKIE_NAME`, `CURRENT_SCHOOL_ID_COOKIE_MAX_AGE`, `currentSchoolIdCookieOptions()`) que mirrorean los literales del endpoint viejo (`api/auth/context/route.ts`, no tocado — esos literales siguen sin ser exports ahí, solo inline). Decisión: valió la pena extraer esto en vez de repetir el objeto de 5 campos inline en `select/route.ts`, para que quede en un solo sitio reutilizable por código nuevo — documentado in-line que si el endpoint viejo cambia esos literales algún día, hay que actualizar esto a mano (no hay una fuente compartida real entre los dos archivos, porque el viejo se dejó explícitamente intacto).
- **Matriz final `mode` × resultado en `POST /api/auth/context/select`:**
  | Caso | `martial_active_context` | `currentSchoolId` | `UserPreference.lastSchoolId` |
  |---|---|---|---|
  | `mode:'dashboard'`, válido | ✅ seteada (60d) | ✅ seteada (7d, mismo `schoolId`) | ✅ upsert |
  | `mode:'student'`, válido | ✅ seteada (60d) | ➖ sin tocar | ➖ sin tocar |
  | válido pero `isValidContext()` → `false` (403) | ❌ ninguna | ❌ ninguna | ❌ ninguna |
  | body inválido (400: `mode`/`schoolId`) | ❌ ninguna | ❌ ninguna | ❌ ninguna |
- **5 tests nuevos** en `apps/web/__tests__/activeContextSelectRoute.test.ts` (nuevo describe `POST /api/auth/context/select — currentSchoolId sync (dashboard-mode bug fix)`, mismo patrón de mocks del archivo — se añadió mock de `@/lib/db` para `prisma.userPreference.upsert`, no existía antes en este archivo): `dashboard` válido → 200 + ambas cookies con mismo `schoolId` + upsert llamado con el payload exacto + confirma que el `maxAge` de `currentSchoolId` (7 días) es distinto del de `martial_active_context` (60 días); `student` válido → 200 + SOLO `martial_active_context`, `currentSchoolId` ausente (`toBeUndefined()`), sin upsert; `dashboard` + `isValidContext()` `false` (403) → ninguna cookie; `mode` fuera de whitelist (400) → ninguna cookie; `schoolId` vacío (400) → ninguna cookie. Los 11 tests ya existentes del archivo (401, 403 por rol/`schoolId` ajeno, whitelist de `mode` incluido case-sensitivity, tipos incorrectos de `schoolId`, extra fields ignorados, `DELETE`) siguen intactos y en verde sin modificarlos — **508 tests pasando** en total (52 archivos, +5 sobre los 503 de la Sesión 66), `check-types` / `lint` (0 errores, mismos warnings preexistentes, ninguno nuevo en los 3 archivos tocados) / `prisma validate` en verde.
- **Sin cambios** en `api/auth/context/route.ts` (el endpoint viejo — ni una línea, solo leído para replicar sus opciones de cookie), APIs de `/api/dashboard/**`, `lib/auth/contexts.ts`/`requireSchoolAccess`, `/api/my/**`, la UI de `/choose-profile` (este PR es 100% backend, un solo endpoint modificado), schema/migraciones, pagos/memberships/Stripe/Revolut.
- **Sin verificación visual** — este PR no toca ningún componente cliente ni ruta de UI, solo un endpoint backend; cubierto por los tests unitarios de arriba, mismo criterio que las Sesiones 60/61 (endpoints puros de backend sin superficie de UI que probar en preview).
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.
  2. **`DELETE /api/auth/context/select` sigue sin limpiar `currentSchoolId`** — decisión explícita de esta sesión (ver arriba), no un descuido; si un PR futuro decide unificar los lifecycles de limpieza de ambas cookies, debe ser una decisión propia, no un efecto secundario de otro ticket.
  3. **Hallazgo separado, fuera de este alcance:** falta de chequeo de rol/pertenencia consistente en varias de las 56/57 rutas de `/api/dashboard/**` más allá de simplemente confiar en `currentSchoolId` — no auditado a fondo en esta sesión (el scope era exclusivamente sincronizar la cookie, no re-auditar cada endpoint de dashboard uno por uno); queda como candidato a una auditoría futura similar a la de la Sesión 65 sobre `/api/my/**`.

### Sesión 64 — 2026-07-12 ✅
**Fixes CSS mobile en dashboard/student portal** — a partir de capturas reales en iPhone (Safari) que el usuario adjuntó mostrando 3 bugs de layout. Sin cambios de schema/API/lógica de negocio, solo layout responsive. Pendiente: **validación visual del usuario en dispositivo real** (no se pudo verificar en preview — proyecto marcado como "el usuario prueba la UI manualmente", ver `feedback_manual_testing`).

- **`app/dashboard/classes/events/EventsClient.tsx` — drawer `EventDrawer` (Create/Edit event) roto en mobile:** causa raíz identificada — el drawer (`min(900px,96vw)` + `px-8`) tenía un `flex gap-8` con columna derecha de **240px fijos** (banner/preview), lo que en un iPhone de 375px dejaba ~24px para toda la columna del formulario (de ahí inputs mostrando un solo carácter y labels partidos palabra por palabra). Fix: layout principal a `flex flex-col md:flex-row`, columna derecha `w-full md:w-[240px] md:shrink-0`, los 3 grids internos de campos (título/tipo, fecha/horas, instructor/location) de `grid-cols-2/3` fijo a `grid-cols-1 sm:grid-cols-2/3`, padding de header/body/footer `px-8` → `px-4 sm:px-8`, fila de "ticket types" con `flex-wrap` + input de nombre `flex: '1 1 160px'` para que precio/capacidad bajen de línea en vez de cortarse, toggles "Public on Explore"/"Show spots left" con `gap-3` + `min-w-0` en el contenedor de texto.
- **`app/my/events/page.tsx` — bottom sheets `ContactOrganizerSheet` y `TicketDrawer` tapados por el `BottomNav`:** causa — ambos el sheet y `BottomNav` (`components/MyShell.tsx:85`) usaban `z-50`; al empatar, `BottomNav` gana por ser el último en el DOM y tapa la última fila del sheet (Instagram). Fix: sheets a `z-[60]`, `pb-8` → `pb-[calc(2rem+env(safe-area-inset-bottom))]` (safe area del home indicator), añadido `max-h-[85vh] overflow-y-auto` como salvaguarda en viewports bajos/landscape.
- **`app/dashboard/users/UsersClient.tsx` — tabs de filtro (All/Active/Pending/Lead/Inactive/Archived) comprimidas en mobile, sin scroll:** el wrapper ya tenía `overflow-x-auto` pero los `<button>` no tenían `whiteSpace: nowrap` ni un contenedor de ancho intrínseco, así que el navegador los comprimía en vez de dejarlos desbordar (por eso "Inactive" se veía cortado sin scrollbar). Fix: mismo patrón ya usado en `MembershipsClient.tsx:1230` — wrapper `overflow-x-auto` + div interno `w-max` + `whiteSpace: 'nowrap'` en cada pill. Sin tocar la tabla, `RowMenu`, ni la lógica de `handleFilter`/`activeFilter`/conteos.
- **`tsc --noEmit` limpio** en los 3 archivos tras cada cambio. No se corrió preview visual (decisión del usuario, ver memoria de feedback).
- **Estado:** los 3 bugs de las capturas quedan resueltos a nivel de código. Pendiente únicamente que el usuario confirme visualmente en un iPhone real (Safari) antes de darlo por cerrado.

### Sesión 65 — 2026-07-11 ✅
**Scoping de `/api/my/**` al contexto student activo (7 endpoints + helper + UI mínima)** — mergeado a `main` en `f0749d8` (branch `fix/my-active-student-context`, PR [#7](https://github.com/MartialOneOnline/martial-v2/pull/7), borrada local + remoto tras confirmar Vercel Production y smoke test de `/`, `/my`, `/api/my`, `/choose-profile`). Nota: mientras el PR estaba abierto se mergeó a `main` un fix de CSS mobile no relacionado que también numeró su entrada como "Sesión 64" — resuelto renumerando esta entrada a 65 antes de mergear; sin conflictos de código, solo de numeración en este changelog.

Cierra el pendiente #3 abierto en las Sesiones 61/62/63 ("Scoping de `/api/my/**` ... por contexto activo — sin cambios, sigue pendiente"): hasta ahora `martial_active_context` (cookie + endpoints, Sesión 61) y `/choose-profile` (selector, Sesión 62) existían pero ningún endpoint de datos los consumía. Un estudiante en 2+ escuelas veía sus bookings, memberships, pagos, eventos, horario y planes de TODAS sus escuelas mezclados en una sola lista (`schoolMembers[0]` o `schoolId:{in:[...todas]}` sin filtrar). Este es el PR de mayor superficie de la serie (7 endpoints), tratado endpoint por endpoint con test propio para cada uno, no como refactor en bloque.

- **`getActiveStudentContext(userId)`** — nuevo, en `lib/auth/activeContextCookie.ts` (hermano de `getActiveContext()`, no en `activeContext.ts` para no acoplarlo a `next/headers`, mismo criterio que ya separó esos dos archivos en la Sesión 61). Devuelve `{kind:'ok', schoolId}` / `{kind:'ambiguous'}` / `{kind:'none'}`:
  1. Cookie `martial_active_context` válida con `mode:'student'` → se usa tal cual.
  2. Cookie `mode:'dashboard'` (o ausente/inválida) → **no es error**, cae al fallback de abajo (tratada igual que "sin cookie").
  3. Exactamente 1 contexto `student` real (vía `listAvailableContexts()`, ya mergeado Sesión 60) → fallback seguro sin necesitar cookie.
  4. 2+ contextos `student` reales sin cookie que los desambigüe → `ambiguous`.
  5. 0 contextos `student` → `none`.
  - Nunca mezcla escuelas silenciosamente: los callers solo reciben un único `schoolId` o una señal explícita de "no se puede determinar".
- **7 endpoints adaptados, uno por uno, con test propio:**
  1. `GET/PATCH /api/my` (`route.ts`) — `memberships`, `bookings` (vía `class.schoolId`), `schoolMembers` y `gradings` ahora filtrados por la escuela activa cuando `kind:'ok'`; `ambiguous` → 409 antes de correr la query completa (solo se ejecuta el `findUnique` mínimo `{id:true}`). `PATCH` **no se tocó** — solo actualiza campos globales del perfil (nombre/teléfono/fecha nacimiento/avatar), no hay escuela que mezclar. Test: `myRouteStaffGuard.test.ts` (+3 casos nuevos: ambiguous→409 sin query completa, scoping por schoolId, `none` sin filtrar).
  2. `GET /api/my/bookings` — `where` gana `class:{schoolId}`. Gana también el guard 403 solo-staff (antes no existía en este endpoint). Test: `myBookingsScope.test.ts` (9 casos).
  3. `GET /api/my/events` — `myBookings` (event tickets) vía `event:{schoolId}`; lista de eventos publicados visible ya no agrega TODAS las escuelas del usuario, solo la activa. Test: `myEventsScope.test.ts` (8 casos).
  4. `GET /api/my/memberships` — `where` gana `schoolId` (aplicado también al re-fetch tras expirar membership). Test: `myMembershipsScope.test.ts` (8 casos).
  5. `GET /api/my/payments` — `where` gana `schoolId` sobre `Transaction`. Test: `myPaymentsScope.test.ts` (8 casos).
  6. `GET /api/my/school-classes` — `schoolIds` colapsa a `[schoolId]` cuando `kind:'ok'`, en vez de agregar todas las escuelas del usuario. Test: `mySchoolClassesScope.test.ts` (8 casos) + `myClassesCanBook.test.ts` existente actualizado (mocks nuevos, misma cobertura, sigue en verde).
  7. `GET /api/my/school-plans` — mismo patrón que (6). Test: `mySchoolPlansScope.test.ts` (8 casos).
  - Regla uniforme en los 7: `ambiguous` → 409 `{error:'student_context_required'}`; `none` + `hasDashboardAccess()` → 403 (mismo guard solo-staff ya mergeado en `/api/my` desde la Sesión 59, extendido ahora a los otros 6); `none` + sin dashboard access (usuario nuevo sin ninguna escuela) → 200 sin filtrar (comportamiento igual que antes, no regresión).
- **6 endpoints por-recurso auditados y NO tocados** (ya scopeaban correctamente vía el `schoolId` propio del recurso + `userId`, sin mezclar escuelas): `bookings/[id]` (booking propio), `memberships/[id]` (membership propio, tanto PATCH pause/resume/cancel como POST request-plan), `checkout` (plan propio vía `planId`), `events/checkout` y `events/reserve` (event propio vía `eventId`), `stripe-portal` (membership propio). Confirmado leyendo cada uno completo antes de decidir no tocarlos.
- **UI mínima en `/my/**`** — `lib/studentContext.ts` (nuevo, cliente): `isStudentContextRequired(body)` detecta el shape del 409 sin duplicar el check en cada página; `chooseProfileUrl(path)` construye `/choose-profile?redirect=<path>` pasando `path` por `safeRedirect()` (mismo helper/patrón que ya usan `login/page.tsx` y `LoginModal.tsx` para su propio `?redirect=` — no se inventó una validación nueva). Las 6 páginas de `/my` (`page.tsx`, `profile`, `membership`, `payments`, `events`, `classes`) llaman `router.replace(chooseProfileUrl(pathname))` en su(s) fetch(es) principal(es) cuando detectan el 409 — **todas usan redirect automático, ninguna CTA**: son vistas de solo lectura recién montadas (no formularios a medio rellenar), así que un redirect inmediato no es disruptivo y es más simple que mantener dos patrones. Otros errores (red ya cubierto por el `.catch()` existente, 401/500 con shape distinto) siguen el camino de error/estado-vacío de siempre, sin que el nuevo check los intercepte.
  - **Nota documentada, no resuelta aquí:** `/choose-profile` (Sesión 62) todavía **no lee** el query param `?redirect=` — su lógica (`app/choose-profile/logic.ts#redirectPathForMode()`) siempre manda a `/dashboard` o `/my` tras elegir, nunca a un path custom. El `?redirect=` que este PR construye queda ahí por compatibilidad futura; hoy el usuario aterriza en `/my` tras elegir y puede volver a navegar a la página que quería, que esta vez funcionará (cookie ya seteada). Se decidió no tocar `/choose-profile` para no exceder el scope de este PR — decisión explícita, no descuido.
  - **Sin verificación visual en navegador real en esta sesión** (memoria del usuario: prefiere probar los cambios de UI él mismo) — la lógica de redirect (`isStudentContextRequired`/`chooseProfileUrl`) se verificó con 8 tests unitarios (`studentContextClientHelper.test.ts`), no con un test de componente (mismo precedente que la Sesión 62: sin `@testing-library/react` en el repo).
- **68 tests nuevos** (7 archivos de scoping + extensión de `activeContextCookie.test.ts` con 9 casos para `getActiveStudentContext()` + extensión de `myRouteStaffGuard.test.ts`/`myClassesCanBook.test.ts` + `studentContextClientHelper.test.ts`) — **487 tests pasando** en total (52 archivos, +68 sobre los 419 de la Sesión 63), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados, ninguno nuevo) / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, APIs de dashboard, `login/page.tsx`/`LoginModal.tsx`/`loginRedirect.ts`, la UI de `/choose-profile` (salvo la nota de arriba, ningún archivo tocado), pagos/memberships/Stripe/Revolut fuera de los 7 endpoints de `/api/my` ya student-facing
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **`/choose-profile` no consume `?redirect=`** — ver nota arriba; wiring de vuelta al path original queda para un PR futuro.
  2. **Unificación `martial_active_context` ↔ `currentSchoolId`** — sigue sin resolverse (ver Sesión 61), no relacionado con el scoping de `/api/my`.
  3. **Gates de `/dashboard/**` por contexto activo** — este PR solo tocó `/api/my/**`, el dashboard sigue sin usar `getActiveContext()`/`isValidContext()`.
  4. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.

### Sesión 63 — 2026-07-11 ✅
**Login → `/choose-profile` cuando hay más de un contexto real (dashboard+student combinados)** — mergeado a `main` en `d2b81be` (branch `fix/login-choose-profile-redirect`, PR [#6](https://github.com/MartialOneOnline/martial-v2/pull/6), borrada local + remoto tras confirmar Vercel Production y probar `/`, `/login`, `/choose-profile`, `/api/auth/contexts` en real).

Conecta por fin el login con el selector construido en la Sesión 62: la Sesión 62 dejó documentado que `resolveRedirect()` (en `login/page.tsx` y `LoginModal.tsx`) seguía usando el modelo viejo `SchoolContext[]`/`GET /api/auth/me` (`staffSchools = schools.filter(s => s.role !== 'STUDENT')`), y que un usuario "STAFF en escuela A + STUDENT en escuela B" caía en `staffSchools.length === 1` → auto-redirect directo a `/dashboard` sin picker, un caso mal enrutado. Este PR es mínimo y aditivo, tratado con el mismo cuidado que un cambio de pagos: es el flujo de login, el de menor margen de error de toda la app.

- **`lib/auth/loginRedirect.ts`** (nuevo, puro, sin imports de React/next/DOM salvo tipos — mismo patrón que `choose-profile/logic.ts`): `resolveLoginRedirectAction()` es la función compartida que reemplaza la lógica inline duplicada en ambos archivos. Prioridad exacta implementada:
  1. `explicitPath` (el `redirectTo`/`?redirect=` ya sanitizado con `safeRedirect()`) → se respeta tal cual, **nunca** llama a `fetchContexts` — se resuelve exactamente igual que hoy, sin pasar por conteo de contextos.
  2. `isSuperAdmin` → `/admin`, tampoco cuenta contextos.
  3. Si ninguna de las dos aplica: llama a `fetchContexts()` (wrapper inyectable, reutiliza `fetchAvailableContexts()` de `app/choose-profile/logic.ts` sin duplicar su lógica de parseo/errores) contra `GET /api/auth/contexts` — el modelo NUEVO (`AvailableContext[]`, dashboard+student combinados), no el viejo `staffSchools`.
     - 0 contextos → `/my` (sin cambios).
     - exactamente 1 → si `mode==='dashboard'`, acción `dashboard-auto` (el caller hace el mismo `POST /api/auth/context` de siempre con ese `schoolId` — la cookie **vieja** `currentSchoolId`, no se toca — y luego `/dashboard`); si `mode==='student'` → `/my`. Byte-a-byte igual al destino de hoy en ambos casos.
     - más de 1 → `/choose-profile` (sin auto-setear `martial_active_context`, sin llamar a `POST /api/auth/context/select` — esa elección la hace el usuario en la propia pantalla, ya mergeada en la Sesión 62).
  - **Manejo de fallos explícito:** si `fetchContexts()` devuelve `ok:false` (red, HTTP no-2xx, JSON inválido — mismos casos que ya maneja `fetchAvailableContexts()`), se cae a `legacyStaffSchoolsAction(legacySchools)`, que reproduce **exactamente** la rama vieja (`staffSchools.length` 0/1/>1 sobre el `SchoolContext[]` que ya se había obtenido de `GET /api/auth/me` para el chequeo de SUPERADMIN — no hace falta un fetch adicional). Decisión explícita: un fallo del endpoint nuevo nunca bloquea el login ni muestra una pantalla rota, simplemente "no se pudo determinar >1, sigue con la lógica vieja" — incluye seguir mostrando el `SchoolPicker` inline si `staffSchools.length > 1` bajo ese fallback, porque combinar dashboard+student de forma segura requiere el endpoint nuevo y no hay que adivinar.
  - **Loop guard:** `isOnChooseProfile` (calculado por el caller con `usePathname() === '/choose-profile'`) hace que la rama de `>1` contextos devuelva `noop` en vez de re-empujar `/choose-profile` si el usuario ya está ahí.
  - Exporta también `legacyStaffSchoolsAction()` y `contextsAction()` sueltas para testearlas de forma aislada además de a través de la orquestación completa.
- **`app/login/page.tsx`** y **`components/LoginModal.tsx`**: ambos `resolveRedirect()` se redujeron a: resolver `redirectTo`/SUPERADMIN igual que siempre (sin tocar ese orden), y delegar el resto a `resolveLoginRedirectAction()` con un `switch` sobre la acción devuelta (`dashboard-auto` → mismo `POST /api/auth/context` + `/dashboard` de siempre; `legacy-picker` → `setPickerSchools()` con el mismo `SchoolPicker` inline de siempre; `noop` → nada; `push` → `router.push(path)`). Ningún otro comportamiento tocado (SSO buttons, forgot-password, forms, etc.)
- **`components/SchoolPicker.tsx` NO se tocó ni se borró** — sigue existiendo tal cual, sigue siendo importado por ambos archivos, pero ya **no es el camino principal** para "staff en 2+ escuelas": solo se renderiza como fallback si `GET /api/auth/contexts` falla. En el camino feliz (endpoint disponible), 2+ escuelas de cualquier combinación dashboard/student van a `/choose-profile`.
- **22 tests nuevos** (`loginRedirectLogic.test.ts`): explicit redirect nunca cuenta contextos (incluso con `isSuperAdmin: true` a la vez, gana el explícito), SUPERADMIN nunca cuenta contextos, 1 STUDENT → `/my`, 1 STAFF → `dashboard-auto`, 0 contextos → `/my`, 2 STAFF → `/choose-profile` (ya no picker), 2 STUDENT → `/choose-profile`, STAFF-A+STUDENT-B (el caso de la auditoría) → `/choose-profile` con `legacySchools` simulando el `staffSchools.length===1` viejo para probar que la nueva ruta lo intercepta antes, ya en `/choose-profile` → `noop`, fallo de red del endpoint nuevo → cae a `legacyStaffSchoolsAction` (dashboard-auto/legacy-picker/`/my` según el `legacySchools` inyectado), más la matriz suelta de `legacyStaffSchoolsAction()`/`contextsAction()` — **419 tests pasando** en total (45 archivos, +22 sobre los 397 de la Sesión 62), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados, ninguno nuevo) / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, `/api/my/**`, APIs de dashboard, pagos/memberships/Stripe/Revolut, la cookie `currentSchoolId` (se sigue seteando exactamente igual para el caso legado de 1 contexto dashboard), la UI de `/choose-profile` (páginas/componentes de la Sesión 62 intactos), ni se auto-setea `martial_active_context` en ningún punto de este flujo (esa cookie solo se setea cuando el usuario elige explícitamente en `/choose-profile`, vía el endpoint `POST /api/auth/context/select` ya existente)
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **Unificación `martial_active_context` ↔ `currentSchoolId`** — sigue sin resolverse (ver Sesión 61); el caso "1 contexto dashboard" sigue seteando solo `currentSchoolId`, no la cookie nueva.
  2. **Scoping de `/api/my/**` y de las APIs de dashboard por contexto activo** — sin cambios, sigue pendiente.
  3. **PR sin mergear todavía** — abierto contra `main`, pendiente de revisión/aprobación del usuario antes de merge.

### Sesión 62 — 2026-07-11 ✅
**Primera UI del selector de perfil/contexto tipo Facebook: `/choose-profile`** — mergeado a `main` en `692115a` (branch `feature/choose-profile`, PR [#5](https://github.com/MartialOneOnline/martial-v2/pull/5), borrada local + remoto tras confirmar Vercel Production). Verificado visualmente en mobile (375×812) y desktop antes de mergear: tema claro confirmado, tarjetas correctas, error state sin crash

Consume la infraestructura ya mergeada en las Sesiones 60/61 (`listAvailableContexts()`, `GET /api/auth/contexts`, `POST/DELETE /api/auth/context/select`) para construir la primera pantalla real del selector — **sin tocar el scoping de `/api/my/**` ni de las APIs de dashboard** (eso queda para un PR futuro), sin tocar `currentSchoolId`, sin schema/migraciones.

- **`app/choose-profile/page.tsx`** (nuevo, server component): única responsabilidad — el guard de auth (sin sesión → `redirect('/login?redirect=/choose-profile')`, mismo patrón que `dashboard/layout.tsx`/`my/layout.tsx`). Además hace un `prisma.user.findUnique` mínimo para el `avatarUrl` del usuario (no lo devuelve `GET /api/auth/contexts`, que describe escuelas, no "quién pregunta") y lo pasa junto al `name` ya presente en `getAuthUser()` como props a `ChooseProfileClient`. **Decisión documentada:** la lista de contextos NO se resuelve aquí vía `listAvailableContexts()` directo — se decidió que la fetchee `ChooseProfileClient` contra `GET /api/auth/contexts`, para no duplicar la misma query en dos sitios y porque el estado de loading/error/retry pedido para la pantalla necesita de todos modos un punto de re-fetch (el retry), que ya es ese mismo endpoint
- **`app/choose-profile/ChooseProfileClient.tsx`** (nuevo, client component): hace `fetch` a `GET /api/auth/contexts` al montar (estado `loading` → `error` con botón reintentar → `ready`), renderiza tarjetas dashboard (logo de escuela o iniciales, nombre de escuela, subtítulo "Dashboard", badge de rol real — mismo `ROLE_LABEL` en inglés que ya usa `components/SchoolPicker.tsx`, sin traducir nombres de rol, seguido su precedente) y tarjetas student (avatar del usuario con fallback a logo de escuela con fallback a iniciales, nombre del usuario, subtítulo "Student at {school}" **y además** el badge de cinturón/grado (`AvailableContext.subtitle`) si existe — decisión: mostrar ambos en vez de elegir uno, mismo tratamiento visual que el badge de rol de las tarjetas dashboard). Click en una tarjeta → `POST /api/auth/context/select` con `{mode, schoolId}` → 200 redirige a `/dashboard` o `/my` según `mode`; 400/403/red → mensaje de error inline, sin redirigir, sin romper la pantalla. Botón final "Use another account" reutiliza `GET /api/auth/signout` (mismo mecanismo que `MyShell.tsx`)
- **`app/choose-profile/logic.ts`** (nuevo, puro, sin imports de React/next/DOM salvo tipos): `classifyContexts()` decide 0/1/>1 → `'empty' | 'single' | 'multiple'`; `redirectPathForMode()` mapea `dashboard→/dashboard`, `student→/my`; `fetchAvailableContexts()`/`selectProfileContext()` envuelven los dos fetches con `fetchImpl` inyectable para testear sin red real. Aislado específicamente para ser testeable con vitest plano — este repo no tiene precedente de `@testing-library/react` (ver Sesión 57), así que el render real de `ChooseProfileClient` se verifica a mano/preview, no con un test de componente
- **Decisión de producto — 1 solo contexto NO auto-redirige:** se muestra igual la tarjeta única, sin saltar automáticamente a `/dashboard` o `/my`. Es la opción más segura (un usuario que llega aquí espera elegir; un auto-redirect equivocado no es trivialmente reversible, mostrar la tarjeta sí) y cuesta solo un clic extra
- **0 contextos → empty state en la propia página** con link a `/explore` (no se inventó ningún flujo de onboarding nuevo)
- **`i18n`**: namespace nuevo `chooseProfile` en `lib/i18n/translations.ts` (EN/ES/PT/FR) — título, subtítulo, labels de estado, textos de error/empty. `ChooseProfileClient` es client component así que consume `useT()` directamente, sin necesidad de truco server/client adicional
- **Tema visual — confirmado NO oscuro:** fondo `bg-gray-25`, tarjetas `bg-white` con `border-gray-200`/hover `border-blue-500`, texto `text-gray-950`/`text-gray-500`, acento `blue-500`/`navy-700` — mismos tokens de `globals.css`, ningún color inventado
- **Decisión explícita — `login/page.tsx`/`LoginModal.tsx` NO se tocaron:** se rastreó el código exacto de `resolveRedirect()` — la rama que hoy cae incondicionalmente en `router.push('/my')` solo se alcanza cuando `staffSchools.length === 0` (cero escuelas con rol staff en el modelo viejo `SchoolContext`/`GET /api/auth/me`). El caso "STAFF en A + STUDENT en B" de la auditoría previa en realidad tiene `staffSchools.length === 1` (la escuela A) y ya cae en la rama que auto-redirige a `/dashboard` sin picker — una rama *distinta y más sensible* de la que describía el ticket. Arreglar eso bien requeriría cruzar dos modelos de contexto distintos (`SchoolContext` viejo vs `AvailableContext` nuevo) dentro de un flujo de login que ya funciona para el caso común (una sola escuela) — más riesgo del que un PR pequeño y aditivo debe asumir. `/choose-profile` queda accesible por URL directa como base para que un PR futuro decida cómo enrutar el login hacia aquí
- **19 tests nuevos** (`chooseProfileLogic.test.ts` 14, `chooseProfilePageGuard.test.ts` 4 + 1 caso adicional): `classifyContexts()` 0/1/>1, `redirectPathForMode()` ambos modos, `fetchAvailableContexts()`/`selectProfileContext()` éxito/red/http sin lanzar excepción nunca, payload exacto `{mode, schoolId}` enviado, guard del server component (sin sesión → redirect a `/login`, con sesión → sin redirect + props correctas incluyendo fallback de avatar nulo) — **397 tests pasando** en total (44 archivos, +19 sobre los 378 de la Sesión 61), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados) / `prisma validate` en verde
- **Sin verificación visual en navegador real en esta sesión** (memoria del usuario: prefiere probar los cambios de UI él mismo) — el tema claro/tokens se verificó por lectura de código y por los mismos valores de `globals.css` que ya usa el resto del dashboard, no por captura de pantalla
- **Riesgos/decisiones abiertas para el PR siguiente, documentadas pero no resueltas aquí:**
  1. **Scoping de `/api/my/**` y de las APIs de dashboard por contexto activo** — siguen sin usar `getActiveContext()`/`isValidContext()` para nada; este PR es solo la UI de selección, no conecta el contexto elegido a ningún endpoint de datos todavía
  2. **Unificación `martial_active_context` ↔ `currentSchoolId`** — sigue sin resolverse (ver Sesión 61)
  3. **Login → `/choose-profile` automático** — no se tocó `resolveRedirect()` en absoluto (ver decisión explícita arriba); un PR futuro podría decidir cruzar `SchoolContext`/`AvailableContext` para detectar el caso mixto real, o migrar `resolveRedirect()` a usar `GET /api/auth/contexts` directamente en vez del viejo `GET /api/auth/me`
  4. **Auto-redirect en 1 solo contexto** — se decidió que no, documentado arriba; reversible en cualquier momento si el producto lo pide

### Sesión 61 — 2026-07-11 ✅
**Cookie + endpoints server-side del contexto activo del selector tipo Facebook** — mergeado a `main` en `6f34eed` (branch `fix/active-context-cookie-api`, PR [#4](https://github.com/MartialOneOnline/martial-v2/pull/4), borrada local + remoto tras confirmar Vercel Production)

Continúa la Sesión 60: `listAvailableContexts()`/`isValidContext()` ya existían como capa pura sin cookie ni endpoint. Este PR añade exactamente eso — persistencia y validación server-side del `ActiveContext` elegido — **sin UI del selector (`/choose-profile`), sin tocar redirects de login, sin tocar el scoping de `/api/my/**` ni de dashboard**. El siguiente PR consumirá esto para construir la UI real.

- **`lib/auth/activeContextCookie.ts`** (nuevo, hermano de `activeContext.ts` — misma razón que separó `activeContext.ts` de `contexts.ts`: `activeContext.ts` es lógica pura de DB sin acoplar `next/headers`, lo que dejaba sus tests mockear solo `@/lib/db`. Este archivo es la capa que sí toca `next/headers`, aislada para no ensuciar esos tests y para que sus propios tests mockeen `next/headers` + `isValidContext()` sin arrastrar Prisma):
  - `ACTIVE_CONTEXT_COOKIE_NAME = 'martial_active_context'` — cookie **nueva y paralela** a la ya existente `currentSchoolId` (`api/auth/context/route.ts`, sesión histórica no relacionada). No se unifican: `currentSchoolId` es solo un `schoolId` para el dashboard, esta cookie guarda el par completo `{mode, schoolId}` (incluye *qué portal*, dashboard o student). La unificación, si procede, queda como decisión abierta de un PR futuro
  - `ACTIVE_CONTEXT_COOKIE_MAX_AGE = 60 días` (vs. los 7 días de `currentSchoolId`) — documentado en el propio archivo: `currentSchoolId` se re-escribe implícitamente casi en cada acción de dashboard (cambiar entre escuelas dentro de una sesión), así que un TTL corto no cuesta nada. El `{mode, schoolId}` de esta cookie es una elección explícita de un picker ("qué sombrero llevo puesto"), se espera una vez por dispositivo y de larga duración — un TTL más largo no relaja seguridad porque cada lectura revalida contra la DB (`isValidContext()`)
  - `parseActiveContextCookie(raw)` — parseo seguro (try/catch + shape check con `ACTIVE_CONTEXT_MODES`), nunca lanza, descarta campos extra
  - `serializeActiveContextCookie(context)` — solo `{mode, schoolId}`, nunca más
  - `getActiveContext(userId)` — lee la cookie con `cookies()`, parsea, y revalida con `isValidContext()`; `null` si falta, está mal formada, o la revalida como inválida (p.ej. cookie manipulada a mano con un `schoolId` ajeno) — **nunca confía en el valor crudo de la cookie**
  - `ACTIVE_CONTEXT_MODES` (whitelist runtime `['dashboard', 'student']`) se añadió en **`activeContext.ts`** (no en el archivo nuevo) como compañero runtime del tipo `ActiveContextMode` ya existente — una sola fuente de verdad para validar strings sueltos (cookie, body de request)
- **`GET /api/auth/contexts`** (nuevo, plural — no choca con el ya existente `GET /api/auth/me`): requiere sesión (401 si no), devuelve `{ contexts, activeContext }` — `contexts` de `listAvailableContexts(userId)`, `activeContext` de `getActiveContext(userId)` (ya revalidado, `null` si no hay cookie o es inválida)
- **`POST/DELETE /api/auth/context/select`** (nuevo — path elegido para no chocar con el ya existente `POST/DELETE /api/auth/context` de `currentSchoolId`, documentado en el propio archivo por qué no se reutilizó ese endpoint): `POST` requiere sesión, valida `mode` con whitelist estricta case-sensitive (400 si no) y `schoolId` string no vacío (400 si no), revalida con `isValidContext()` (403 si el shape es válido pero el usuario no tiene ese contexto — nunca 400 para ese caso), solo entonces setea la cookie y devuelve `{ activeContext }`; nunca dispara redirect. `DELETE` **no requiere sesión**, mismo criterio que el `DELETE` ya existente de `currentSchoolId` (limpiar una cookie de contexto no tiene implicación de confidencialidad), borra la cookie y devuelve `{ ok: true }`
- **Body nunca reflejado tal cual:** ambos endpoints desestructuran solo los campos que entienden (`mode`, `schoolId`) — cualquier campo extra en el body (`role`, etc.) se descarta silenciosamente, nunca se mezcla en la respuesta ni en la cookie
- **31 tests nuevos** (`activeContextCookie.test.ts` 17, `activeContextContextsRoute.test.ts` 5, `activeContextSelectRoute.test.ts` 11 — mismo patrón de mocks que `myRouteStaffGuard.test.ts`/`classCancelOccurrenceNotifications.test.ts`: mock de `@/lib/auth/server` para `getAuthUser`, mock de `@/lib/auth/activeContext` para `isValidContext`/`ACTIVE_CONTEXT_MODES`, mock de `next/headers` `cookies()`): 401 sin sesión en ambos GET/POST, `activeContext: null` sin cookie, cookie válida reflejada, **cookie manipulada a mano (JSON válido, `schoolId` ajeno) revalidada como inválida sin lanzar excepción** (el requisito explícito del ticket), 200+`Set-Cookie` con las opciones esperadas en POST válido, 403 sin `Set-Cookie` en contexto inválido por rol o por `schoolId` de otro usuario, 400 para `mode` fuera de whitelist (incluye `"DASHBOARD"` con mayúsculas, case-sensitive exacto) y para `schoolId` vacío/número/array, `DELETE` sin sesión limpia la cookie — **378 tests pasando** en total (42 archivos, +31 sobre los 347 de la Sesión 60), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados) / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, sin UI del selector (`/choose-profile` no existe todavía), sin tocar redirects de login, `/api/my/**`, rutas de `/dashboard/**`, pagos/memberships/Stripe/Revolut, ni el endpoint/cookie ya existente `currentSchoolId`/`api/auth/context/route.ts` (no se modificó una sola línea de ese archivo)
- **Decisiones abiertas para PRs futuros, documentadas pero no resueltas aquí:**
  1. **Unificar o no `martial_active_context` con `currentSchoolId`** — hoy son dos mecanismos paralelos; una unificación futura podría derivar `currentSchoolId` del `ActiveContext` cuando `mode==='dashboard'`, pero no es trivial (TTLs distintos, `UserPreference.lastSchoolId` como fallback cross-device que `currentSchoolId` sí tiene y esta cookie no)
  2. **UI del selector (`/choose-profile`)** — este PR solo da la API que la consumirá, ningún componente
  3. **`/api/my/**` scoping por escuela** y **gates de dashboard/página por contexto activo** — siguen sin usar `getActiveContext()`/`isValidContext()` para nada todavía; conectar esos 7+ endpoints y los guards de `/dashboard` y `/my` a esta cookie es trabajo de un PR posterior
  4. **Login redirect a `/choose-profile`** cuando el usuario tiene 2+ contextos — no se tocó ningún redirect de login en este PR

### Sesión 60 — 2026-07-11 ✅
**Base server-side del selector de contexto tipo Facebook: helpers puros `listAvailableContexts()` / `isValidContext()`** — mergeado a `main` en `fe9ad92` (branch `fix/context-selector-foundation`, PR [#3](https://github.com/MartialOneOnline/martial-v2/pull/3), borrada local + remoto tras confirmar Vercel Production)

Continúa la línea de la Sesión 59 (guard `/my` vs `/dashboard`) hacia el selector de contexto: hoy un usuario con varias escuelas o roles duales no tiene forma de elegir explícitamente "en qué escuela/modo estoy" — `getUserContexts()` resuelve `currentSchoolId` con un fallback silencioso al primero encontrado. Este PR es solo la capa de librería pura que un selector de contexto (estilo Facebook, tarjetas de escuela/rol) va a necesitar — **sin UI, sin cookie, sin redirect, sin tocar `/api/my/**` ni `hasDashboardAccess()`/`hasStudentAccess()`** (se reutilizan tal cual, no se tocan).

- **`lib/auth/activeContext.ts`** (nuevo, hermano de `contexts.ts` — no se metió ahí para no mezclar "gates globales de acceso" con "listar/validar contextos concretos"):
  - Tipos: `ActiveContextMode = 'dashboard' | 'student'`, `ActiveContext = { mode, schoolId }` (la forma mínima que una futura cookie guardaría), `AvailableContext = ActiveContext & { schoolName, schoolLogoUrl, role, subtitle }` (una fila de tarjeta — usa solo columnas que el schema ya tiene, confirmado en la auditoría previa)
  - `listAvailableContexts(userId)` — un `findMany` de `SchoolMember` con `OR` de los dos mismos criterios de status que ya usan `hasDashboardAccess()`/`hasStudentAccess()` (`ACTIVE` para roles de `DASHBOARD_ROLES`, `ACTIVE`/`LEAD`/`FROZEN` para `STUDENT`) — **ARCHIVED e INACTIVE quedan fuera de ambos criterios, así que nunca generan contexto**, sin necesidad de un branch especial. Orden: contextos `dashboard` antes que `student`, y alfabético por nombre de escuela dentro de cada grupo (documentado como arbitrario pero determinista)
  - `isValidContext(userId, { mode, schoolId })` — hace su propia query (`count`, no reutiliza `listAvailableContexts`), mismos criterios de status/rol por modo; rechaza escuela de otro usuario, escuela inexistente, o modo que no coincide con el rol real de esa fila
  - **Invariante documentado y testeado explícitamente:** `SchoolMember` tiene `@@unique([schoolId, userId])` → una fila nunca puede generar más de un `AvailableContext`. Una fila con rol staff (p.ej. `OWNER`) que además tenga `belt`/`beltDegree` no nulos (instructor que también entrena y gradúa) sigue siendo un único contexto `dashboard` — no aparece un contexto `student` adicional para esa misma escuela. Resolver "staff + student en la misma escuela como dos contextos" requeriría permitir dos filas `SchoolMember` por `(schoolId, userId)`, un cambio de schema explícitamente fuera de este PR
  - **SUPERADMIN:** `listAvailableContexts()` solo mira `SchoolMember`; un SUPERADMIN sin fila propia da array vacío — correcto, documentado en el propio archivo que el bypass a `/admin` vive en otra capa (chequeo de `User.role`), no en esta función
- **17 tests nuevos** (`activeContext.test.ts`): STUDENT en 1/2 escuelas, `DASHBOARD_ROLES` en 1/2 escuelas, staff en A + student en B (2 contextos, dashboard primero), staff con belt/beltDegree no genera contexto extra, subtitle con/sin degree (degree 0 no se muestra), ARCHIVED no genera contexto (vacío + `where` exacto enviado a Prisma), y toda la matriz de `isValidContext` (acepta válidos, rechaza modo-rol cruzado, rechaza escuela de otro usuario, rechaza escuela inexistente, rechaza ARCHIVED) — **347 tests pasando** en total (39 archivos, +16 sobre los 331 de la Sesión 59), `check-types` / `lint` (0 errores, solo warnings preexistentes no relacionados) / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, sin UI, sin cookies, sin redirects, sin tocar `/api/my/**`, `/dashboard/**`, pagos/memberships/Stripe/Revolut, ni la lógica/firma de `hasDashboardAccess()`/`hasStudentAccess()` (solo se reutiliza `DASHBOARD_ROLES` y los mismos criterios de status, citándolos en comentarios)
- **Decisiones abiertas para PRs futuros, documentadas pero no resueltas aquí:**
  1. **Cookie + endpoint** para persistir el `ActiveContext` elegido y leerlo en cada request (este PR deja `isValidContext()` listo para esa validación, pero no lee ninguna cookie)
  2. **UI del selector** (tarjetas estilo Facebook) — este PR solo da la forma de datos (`AvailableContext`), no el componente
  3. **`/api/my/**` scoping por escuela** — los 7 endpoints que mezclan datos de todas las escuelas del usuario (identificados en la auditoría previa) seguirán sin `schoolId` hasta que el contexto activo real esté persistido y consumido ahí
  4. **`hasDashboardAccess()`/`hasStudentAccess()` por escuela** — siguen siendo gates globales; una vez exista el contexto activo persistido, un PR futuro podría querer una versión "¿tiene acceso a *esta* escuela concreta con este modo?" — que de hecho `isValidContext()` ya resuelve, solo falta conectarla a los gates de página/API existentes

### Sesión 59 — 2026-07-11 ✅
**Guard inverso en `/my`: cuentas solo-staff no deben acceder al portal student** — mergeado a `main` en `f99a88f` (branch `fix/my-portal-staff-guard`, PR [#2](https://github.com/MartialOneOnline/martial-v2/pull/2), borrada local + remoto tras confirmar Vercel Production)

`hasDashboardAccess()` (SchoolMember con rol staff: `OWNER`/`ADMIN`/`MANAGER`/`INSTRUCTOR`/`ASSISTANT_INSTRUCTOR`/`RECEPTIONIST`) gatea `/dashboard`, y `dashboard/layout.tsx` ya redirige a `/my` a quien no tenga ese acceso. Pero `/my` no tenía el guard contrario: su layout era un client component sin ningún chequeo de auth, y `GET`/`PATCH /api/my` leían `schoolMembers[0]` sin filtrar por rol. Una cuenta solo-staff (p.ej. un `OWNER` cuyo `SchoolMember` existe únicamente para darle permisos de dashboard — ese modelo es intencional y no se toca) podía abrir `/my/profile` a mano y ver un perfil de alumno falso/vacío (0 clases, sin cinturón), porque esa fila de `SchoolMember` nunca representó actividad de entrenamiento real.

- **`lib/auth/contexts.ts`** — nuevo `hasStudentAccess(userId)`: true solo si el usuario tiene un `SchoolMember` con rol `STUDENT` real (mismo shape/lista de status que `hasDashboardAccess()`)
- **`app/my/layout.tsx`** — pasa de client component a server component: redirige a `/login` si no hay sesión, y a `/dashboard` si `staffAccess && !studentAccess` (inverso exacto del guard de `dashboard/layout.tsx`). El contenido del layout anterior se movió sin cambios a **`components/MyShell.tsx`** (mismo patrón que `DashboardShell.tsx`)
- **`app/api/my/route.ts`** — el query de `schoolMembers` ahora filtra `role: 'STUDENT'`; `GET` y `PATCH` devuelven 403 para el mismo caso solo-staff (defensa en profundidad para acceso directo a la API)
- **Regla de acceso implementada:** `/my` se bloquea solo cuando el usuario tiene acceso staff **y** ningún `STUDENT` real en ninguna escuela. Staff que *también* es alumno real en alguna escuela (rol dual) mantiene acceso. Usuario sin ningún `SchoolMember` (cuenta nueva sin escuela todavía) no se ve afectado — comportamiento igual que antes
- **12 tests nuevos** (`myPortalStaffGuard.test.ts`, `myRouteStaffGuard.test.ts`): `hasStudentAccess()` aislado, redirect de `MyLayout` (sin sesión → `/login`, solo-staff → `/dashboard`, STUDENT normal → sin redirect, staff+student dual → sin redirect, sin `SchoolMember` → sin redirect), y la matriz 403/200 de `GET`/`PATCH /api/my` — **331 tests pasando** en total (38 archivos), `check-types` / `lint` (0 errores) / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, modelo `SchoolMember`, lógica de dashboard access (solo reutilizada), pagos/memberships/Stripe/Revolut, ni los redirects de login (`login/page.tsx`, `LoginModal.tsx`, `Header.tsx` no tocados)
- **Riesgo/caso límite pendiente de decisión de producto:** un usuario con `SchoolMember` en varias escuelas con roles distintos (p.ej. staff en la escuela A, `STUDENT` en la escuela B) entra a `/my` pero `/api/my` no distingue de qué escuela es el contexto — el student portal sigue mostrando el primer `STUDENT` encontrado entre todas las escuelas, no necesariamente el de la escuela "activa". No se tocó porque el ticket pedía solo el guard, no un selector de escuela en `/my`

### Sesión 58 — 2026-07-11 ✅
**Notificaciones `CLASS_CANCELLED` al cancelar una ocurrencia de clase** — mergeado a `main` en `fb09c35` (branch `fix/class-cancelled-notifications`, borrada local + remoto tras confirmar Vercel Production)

`NotificationType.CLASS_CANCELLED` existía en el enum y estaba pintado en la UI (`NotificationsClient.tsx`/`NotificationsPopup.tsx`) pero `POST /api/dashboard/classes/[id]/cancel-occurrence` cancelaba reservas sin disparar ninguna notificación — era uno de los 6 tipos del enum "vivos en la UI, muertos en el backend" identificados en la auditoría P1/P2. Este PR conecta ese tipo específico, sin tocar los otros 5 (`PAYMENT_PENDING`, `MEMBERSHIP_EXPIRING`, `CLASS_FULL`, `GRADING_COMPLETED`, `STUDENT_INACTIVE` — graduaciones explícitamente fuera de scope, el resto queda como gap conocido).

- **Hallazgo importante, no anticipado en el ticket — documentado en vez de implementar algo engañoso:** el modelo `Notification` **no tiene ningún canal de entrega a alumnos**. `GET /api/dashboard/notifications` exige `hasPermission(role, 'school.notifications.view')`, y `STUDENT` no tiene ese permiso en `lib/auth/permissions.ts` — así que un STUDENT nunca podría ver una notificación aunque `recipientUserId` apuntara a su `userId`. Peor: si hubiera puesto `recipientUserId = studentId`, la fila habría quedado invisible **también para el staff** (`visibleTo()` solo muestra `recipientUserId: null` o `=== el propio staff que consulta`). Decisión tomada: notificaciones **school-wide** (`recipientUserId` sin definir, igual que todos los demás factories existentes), una por alumno afectado, con el nombre del alumno en el `body` — visibles al staff de la escuela, no al alumno. Construir notificaciones realmente visibles para alumnos requeriría una feature nueva (endpoint `/api/my/notifications`, UI en `/my`, posible cambio de modelo) — fuera de scope de un PR pequeño, documentado como riesgo restante
- **`lib/notifications/create.ts`** — nuevo factory `notifyClassCancelled(schoolId, studentName, className, dateLabel, classId)`, mismo patrón fire-and-forget que los demás (`createNotification()` sin `await`, `.catch(()=>{})`). `classId` no tiene columna dedicada en `Notification` (sin metadata JSON) así que viaja en `href` (`/dashboard/classes?classId=...`) en vez de requerir una migración — la página no lee ese query param todavía, pero queda ahí sin coste para un futuro deep-link
- **`cancel-occurrence/route.ts`** — cambio mínimo: antes hacía un solo `updateMany()` (que no devuelve las filas, solo un count). Ahora hace `findMany()` con el mismo `where` primero (para saber qué alumnos notificar) y luego `updateMany({ where: { id: { in: affectedIds } } })` con esos ids exactos — la lógica de selección de reservas afectadas (classId + schoolId + rango de fecha + status no-CANCELLED) no cambió en absoluto, solo se partió en dos pasos. Idempotencia gratis: una segunda llamada para la misma clase/fecha encuentra `affected.length === 0` (las reservas ya están CANCELLED) y no crea ninguna notificación — no hizo falta ningún helper de dedupe nuevo. Permisos sin cambios (`OWNER`/`ADMIN`/`MANAGER`)
- **10 tests nuevos** (`classCancelOccurrenceNotifications.test.ts`): una notificación por alumno afectado con contexto correcto, `updateMany` sigue escribiendo solo los ids afectados, sin reservas activas → 0 notificaciones, llamada repetida no duplica, el query de "afectadas" está scopeado a class+school+fecha exacta (aísla implícitamente otra escuela/clase/fecha), fallback de nombre de clase/alumno si faltan datos, OWNER/ADMIN/MANAGER pueden cancelar, INSTRUCTOR sigue en 403, 401 sin sesión — **314 tests pasando** en total (36 archivos), `check-types` / `lint` / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, sin tocar graduaciones, pagos/memberships/Stripe/Revolut, la lógica de capacidad de reservas de la Sesión 55, upload (Sesión 56), ni class delete (Sesión 57)
- **Riesgo restante, no resuelto:** las notificaciones son visibles para staff, no para los alumnos afectados — ver el hallazgo de arriba. Los otros 5 tipos de `NotificationType` siguen sin ningún trigger en el backend, deliberadamente fuera de este PR

### Sesión 57 — 2026-07-11 ✅
**Borrado de clase con reservas — 409 limpio en vez de 500/fallo silencioso** — mergeado a `main` en `d9f9b1a` (branch `fix/class-delete-with-bookings`, borrada local + remoto tras confirmar Vercel Production)

Cierra el último riesgo pendiente de la auditoría P1/P2 fuera de pagos: `DELETE /api/dashboard/classes/[id]` hacía `prisma.class.delete()` sin manejar la FK. `Booking.classId` es una FK requerida sin cascada — Postgres protege con `RESTRICT`, así que cualquier clase que alguna vez tuvo una reserva lanzaba una excepción no capturada (500) en vez de un error limpio. En el frontend, `ClassesClient.handleDelete()` ni revisaba `res.ok` ni mostraba nada — el admin veía la modal cerrarse y un toast de "Class deleted" incluso cuando el borrado había fallado en el servidor.

- **Backend (`classes/[id]/route.ts`):** antes de borrar, cuenta `Booking` para ese `classId` — **sin filtrar por status**, a propósito: la FK bloquea el borrado sin importar si las reservas están `CANCELLED` o no, así que el pre-check tiene que reflejar exactamente esa realidad o predeciría éxito y luego igual crashearía. Si hay alguna → 409 `"Cannot delete a class with existing bookings. Deactivate it instead."`, sin tocar la clase. Si no hay ninguna, sigue el `delete` de siempre, ahora envuelto en `try/catch` capturando `Prisma.PrismaClientKnownRequestError` con `code==='P2003'` como backstop de una reserva creada en la ventana de carrera entre el conteo y el delete — mismo mensaje 409, nunca 500. Permisos sin cambios (`school.classes.delete`, sigue siendo OWNER/ADMIN vía `hasPermission`)
- **Frontend (`ClassesClient.tsx`):** `handleDelete()` ahora revisa `res.ok`; si falla, guarda el mensaje de error y **no** cierra la modal ni borra la clase del estado local ni muestra el toast de éxito — antes hacía las tres cosas incondicionalmente. `DeleteModal` gana un slot de error opcional (mismo estilo que ya usa `AddClassDrawer` para sus propios errores: `fontSize: 12, color: '#DC2626'`) y un estado `deleting` que deshabilita el botón mientras la request está en vuelo (antes no había ningún feedback de carga). El error se limpia al abrir la modal para otra clase y al cancelar
- **12 tests nuevos** (`classDeleteWithBookings.test.ts`, 7; `ClassesClient` no tiene infraestructura de tests de componente — no existe `@testing-library/react` en el repo, ni aquí ni en ningún otro archivo de test, así que el frontend queda sin cobertura automatizada, solo revisado a mano y con `check-types`): sin reservas → 200 + `class.delete` llamado; con reservas → 409, `class.delete` **no** llamado; el conteo cuenta cualquier status, no solo activas; P2003 en el delete real → 409 limpio (no 500); un error Prisma que no es P2003 se re-lanza tal cual (no se enmascara); 404 si la clase no existe en esta escuela; MANAGER (sin `school.classes.delete`) → 403 — **304 tests pasando** en total (35 archivos), `check-types` / `lint` / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, sin tocar la lógica de capacidad/booking creation de la Sesión 55, sin tocar pagos/memberships/Stripe/Revolut
- **Riesgo restante, no resuelto:** ningún test de componente cubre el flujo del frontend (no borrar localmente, mostrar el mensaje) — la infraestructura no existe en el repo y añadirla habría sido una expansión de scope no pedida; verificado solo por lectura de código + `check-types`, sin `preview_*` en esta sesión (cambio de dashboard admin, no fácil de probar sin datos reales de clase+reservas)

### Sesión 56 — 2026-07-11 ✅
**Hardening de `POST /api/dashboard/upload`** — mergeado a `main` en `014463d` (branch `fix/dashboard-upload-auth-guard`, borrada local + remoto tras confirmar Vercel Production)

Cierra el siguiente riesgo de la misma auditoría P1/P2 fuera de pagos que dio lugar a la Sesión 55: de 57 rutas `/api/dashboard/**`, esta era una de las 2 sin ningún control de rol/escuela (la otra, `dashboard/profile/route.ts`, es legítima — autoscopeada por `user.id`). Cualquier usuario autenticado, incluso sin `SchoolMember` en ninguna escuela, podía subir archivos usando la service-role key de Supabase (bypassa RLS), y el parámetro `bucket` se pasaba tal cual a la Storage API sin allow-list.

- **Control de acceso añadido:** mismo patrón que el resto de `/api/dashboard/**` (`getAuthUser` → `getCurrentSchoolId` → `requireSchoolAccess`), pero en vez de una lista de roles ad-hoc reutiliza `DASHBOARD_ROLES` (recién **exportada** desde `lib/auth/contexts.ts`, un cambio de una palabra — ya existía como const interna, es exactamente "todo rol excepto STUDENT", la misma definición que ya usa `hasDashboardAccess()` para la puerta de entrada a `/dashboard`). STUDENT o sin `SchoolMember` en la escuela actual → 403; sin sesión → 401; SUPERADMIN sigue pasando sin chequeo de rol (igual que el resto de rutas)
  - **Decisión tomada, no la más estricta del enunciado original:** el ticket sugería `OWNER/ADMIN/INSTRUCTOR` como ejemplo; usé el set completo no-STUDENT (`OWNER/ADMIN/MANAGER/INSTRUCTOR/ASSISTANT_INSTRUCTOR/RECEPTIONIST`) porque uno de los 3 callers reales (subir el propio avatar en Settings > Profile) ya es alcanzable hoy por *cualquier* rol de dashboard — `PATCH /api/dashboard/profile` no tiene ningún gate de rol, es autoscopeado por `user.id` — así que restringir el upload a solo 3 roles habría roto el auto-avatar para ASSISTANT_INSTRUCTOR/RECEPTIONIST sin necesidad, violando el requisito de mantener compatibilidad con los callers actuales
- **Allow-list de buckets:** `avatars` / `class-images` — únicos dos que existen de verdad en Supabase Storage (verificado antes vía `GET /storage/v1/bucket`, sesión anterior) y únicos que usa algún caller real (`SettingsClient` avatar/logo/cover, `ClassesClient`/`EventsClient`/`MembershipsClient` class-images). Cualquier otro valor → 400 antes de tocar Supabase
- **Path traversal cerrado en el origen, no con un regex:** la extensión del archivo guardado ya no se parsea del `File.name` del cliente (`file.name.split('.').pop()` — la única entrada controlada por el cliente que llegaba al path) sino que se deriva de un mapa fijo `EXT_BY_TYPE` a partir del `File.type` ya validado (`image/jpeg`→`jpg`, `image/png`→`png`, `image/webp`→`webp`). El nombre real del archivo nunca se usa para construir el path — cero superficie de traversal, sin necesidad de sanitizar strings
- **Compatibilidad verificada:** los 6 call sites reales (`SettingsClient.tsx` ×3 — avatar propio, logo escuela, cover escuela, todos `bucket=avatars`; `ClassesClient.tsx`/`EventsClient.tsx`×2/`MembershipsClient.tsx` — todos `bucket=class-images`) siguen funcionando sin cambios, ningún caller tocado
- **22 tests nuevos** (`dashboardUploadAuth.test.ts`): 401 sin auth, 403 STUDENT, 403 sin SchoolMember, 200 para cada uno de los 6 roles no-STUDENT, SUPERADMIN bypassa el check de rol, 400 bucket no permitido (sin llamar a `fetch`), 200 avatars/class-images, default a avatars si se omite el param, 400 sin archivo, 400 tipo no soportado, 400 archivo >5MB, extensión derivada de `File.type` ignorando un `File.name` hostil (`../../../etc/passwd`), png/webp mapean bien, los 3 patrones de caller reales siguen en 200 — **297 tests pasando** en total (34 archivos), `check-types` / `lint` / `prisma validate` en verde
- **Sin cambios** de schema/migraciones, sin tocar pagos/memberships/Stripe/Revolut, sin tocar UI (ningún caller necesitó cambios), sin tocar Laravel V1
- **Riesgo restante, no resuelto:** los 2 buckets siguen siendo públicos en Supabase Storage (confirmado en sesión anterior) — este PR no cambia eso, solo evita que un usuario no autorizado pueda escribir en ellos vía este endpoint; la política de visibilidad de los buckets en sí es una decisión de infraestructura fuera del scope de una PR de código

### Sesión 55 — 2026-07-11 ✅
**Guard de capacidad/membership en reservas creadas por staff** — mergeado a `main` en `d7d233a` (branch `fix/staff-booking-capacity-guard`, borrada local + remoto tras confirmar Vercel Production)

Sale de una auditoría corta (P1/P2 fuera de pagos, sin cambios de código) que comparó `POST /api/bookings` (auto-reserva del alumno, con capacidad + membership + classAccess robusto y bien testeado) contra los dos endpoints equivalentes para staff, que no tenían ningún control.

- **`POST /api/dashboard/classes/[id]/bookings`** ("Add Booking" del popup de clase) — dos gaps cerrados:
  1. Verifica que `userId` tiene un `SchoolMember` en la escuela actual antes de crear la reserva → 404 "Student not found in this school" si no (antes: aceptaba cualquier userId de toda la tabla `User`, de cualquier escuela)
  2. Duplicate check + capacity check + create ahora corren dentro de un `$transaction` con el mismo advisory lock (namespace 1, key `classId:scheduledAt`) que ya usa `POST /api/bookings`. Si `class.capacity` no es `null` y ya hay `capacity` reservas `CONFIRMED`/`PENDING` en ese `scheduledAt` exacto → 409 "Class is full" (mismo código que el `FULL` de `bookingEligibility`, sin importar `bookingEligibility.ts` — es una réplica mínima inline, ese archivo sigue intacto)
- **`POST /api/dashboard/checkin`** (walk-in QR) — nunca bloquea el walk-in por capacidad (el alumno ya está físicamente presente); en vez de eso, dentro de la misma transacción existente (lock namespace 3) cuenta las reservas activas del día tras la escritura y devuelve `atCapacity: boolean` en la respuesta JSON. Comportamiento de creación/idempotencia sin cambios
- **UI mínima:** `CheckinClient.tsx` (scanner QR) muestra un aviso no bloqueante "⚠ Class is at capacity" en el overlay de éxito cuando `atCapacity=true`; sin rediseño
- **Fix post-review — `scheduledAt` desalineado entre staff y self-booking (encontrado antes de mergear, corregido en el mismo PR):** la primera versión de `classes/[id]/bookings` seguía fijando `scheduledAt` a mediodía (`date + 12:00:00`, hora local del servidor) mientras que `POST /api/bookings` usa la hora real del `Class.schedule` (vía `nextOccurrence`, en UTC — ver `GET /api/my/school-classes`). Esto significaba que el lock, el conteo de capacidad y el índice único nunca veían las mismas filas entre ambos flujos: una clase llena solo de auto-reservas (a la hora real) aparecía vacía para este endpoint (contando a mediodía), así que staff podía seguir añadiendo alumnos sin límite real. **Corregido:** nueva función pura `scheduledAtForDate(dateStr, schedule)` en `lib/scheduling.ts` (aditiva, no toca `nextOccurrence`/`nextScheduledAt`/`isValidScheduledAt`) — resuelve la hora real del slot para la fecha pedida, mismo criterio UTC que usa la generación de ocurrencias reales; fallback a mediodía UTC solo si la clase no tiene un slot para ese día de la semana. `classes/[id]/bookings` ahora usa esto para `scheduledAt`, y el lock/capacity-count/día-de-duplicados quedan alineados con self-booking para clases con horario real
- **Race-safety:** ambos endpoints reutilizan el patrón ya probado de `/api/bookings` — `pg_advisory_xact_lock` dentro de `$transaction`, mismo namespace 1 para add-booking (comparte lock con self-booking **y ahora también la misma key exacta** para clases con horario), namespace 3 ya existente para checkin. Verificado con test de dos requests concurrentes contra `capacity=1` con dos alumnos distintos: exactamente una 200 y una 409, `booking.create` llamado una sola vez
- **17 tests nuevos/actualizados** — `staffBookingConstraint.test.ts` (9 nuevos: 404 no-member, 409 llena, capacity=null sin límite, cupo libre 200, concurrencia add-booking, checkin atCapacity true/false, `scheduledAt` resuelto a la hora real del slot, capacity check detecta una auto-reserva ya sentada en esa hora real; los 6 existentes de duplicados/idempotencia/lock siguen pasando) + `scheduling.test.ts` (5 nuevos para `scheduledAtForDate`, incluida equivalencia exacta con `nextOccurrence`) — **275 tests pasando** en total (33 archivos), `check-types` / `lint` / `prisma validate` en verde
- **Sin cambios** en `/api/bookings`, `bookingEligibility.ts`, pagos/memberships/Stripe/Revolut, permisos, ni schema/migraciones
- **Riesgo restante, no resuelto (deliberadamente fuera de scope):** para clases **sin** horario (`Class.schedule` vacío/null) o sin slot para ese día de la semana, `classes/[id]/bookings` sigue cayendo al fallback de mediodía UTC — en ese caso concreto (poco común) el lock/capacity de este endpoint solo protege staff-vs-staff, no staff-vs-self-booking, porque una auto-reserva para una clase sin horario tampoco tiene una hora "canónica" real con la que alinearse. `checkin`'s creación de walk-in (`scheduledAt: base`) tampoco se tocó — su `atCapacity` ya usaba rango de día (no instante exacto), así que no tenía este bug

### Sesión 54 — 2026-07-10 ✅
**Resolución manual de `Transaction.FLAGGED`** — mergeado a `main` en `98c4bdf` (branch `fix/flagged-transaction-resolution`, borrada local + remoto tras confirmar Vercel Production y migración aplicada)

Permite a un admin marcar una `Transaction.FLAGGED` (creada por los webhooks de Stripe/Revolut cuando el `SchoolMember` está ARCHIVED — Sesiones 50/51) como resuelta, sin borrarla ni reactivar nada automáticamente.

- **Diseño:** el `status` se queda en `FLAGGED` para siempre — la resolución es metadata añadida encima (`resolvedAt`/`resolvedBy`/`resolutionNote`), no una transición de estado nueva. Así el guard de `DELETE` sigue siendo un único check (`status === 'FLAGGED'`) sin excepciones, y queda una señal histórica permanente de "esto se marcó en algún momento" incluso después de resuelto
- **Schema:** `Transaction.resolvedAt`/`resolvedBy` (FK a `User`, `SET NULL`)/`resolutionNote`; `User.resolvedTransactions` (relación inversa). Migración `20260710180000_add_transaction_resolution_fields` (3 columnas nullable + 1 FK) — **aplicada en producción** (`prisma migrate deploy`), `migrate status` → "Database schema is up to date!", columnas y FK verificadas directamente en la BD (`information_schema.columns` + `pg_constraint`)
- **`PATCH /api/dashboard/transactions/[id]`** — nueva acción `{ action: 'resolve', note? }`: valida que la transacción sea `FLAGGED` (400 si no) y no esté ya resuelta (400 si sí), guarda `resolvedAt`/`resolvedBy`/`resolutionNote` (nota recortada a 2000 chars). Ningún refund ni reactivación automática — eso lo sigue haciendo el admin a mano fuera de la app
- **`DELETE /api/dashboard/transactions/[id]`** — guard de FLAGGED sin cambios funcionales, solo mensaje aclarado: bloquea incondicionalmente, resuelto o no
- **`GET /api/dashboard/transactions`** — nuevo query param `resolved` (`true`/`false`/`all`, solo aplica con `status=FLAGGED`, default = no resueltas); el contador del tab "Needs review" (`countByStatus.FLAGGED`) ahora es un `count()` dedicado sobre `resolvedAt: null`, ya no el total bruto del `groupBy`; cada fila devuelve `resolvedAt`/`resolvedByName`/`resolutionNote`
- **UI (`TransactionsClient.tsx`):** botón "Mark resolved" en el menú de fila (solo si `FLAGGED` y no resuelta) → `ResolveModal` (nota opcional + confirmación); badge "Resolved" en la tabla y en el drawer de detalle junto al status; toggle "Show resolved" en el tab "Needs review" para ver el histórico (oculto por defecto — la vista por defecto solo muestra pendientes reales)
- **9 tests nuevos** (`transactionResolution.test.ts`): admin puede resolver, STUDENT no puede (403), no se puede resolver algo no-FLAGGED (400) ni ya resuelto (400), 404 si no existe, `DELETE` sigue bloqueado resuelto o no, `GET` filtra por `resolvedAt: null` por defecto y con `resolved=all` no filtra, el contador del tab usa el count dedicado — **261 tests pasando** en total (33 archivos), `check-types` / `lint` / `prisma validate` en verde
- **Sin cambios** en `recordFlaggedPayment` ni en los webhooks Stripe/Revolut — la resolución es puramente un flujo admin sobre filas ya creadas
- **Smoke check post-deploy:** `findMany` con el include `resolvedByUser` y la query `status=FLAGGED, resolvedAt: null` (misma forma exacta que usa el GET real) ejecutadas contra producción sin error — 0 filas `FLAGGED` existen ahora mismo en producción, así que no había fixture real para probar un `resolve` end-to-end sin crear datos falsos a propósito; esa lógica ya está cubierta por los 9 tests automatizados. Sin probar en el navegador (cambio backend-first, UI no verificada con `preview_*` en esta sesión)

### Sesión 53 — 2026-07-10 ✅
**Sandbox de pagos: script + runbook para probar Stripe sin dinero real** — mergeado a `main` en `0c1c7ce` (branch `fix/payment-sandbox-setup`, borrada tras el merge)

Cierra el pendiente de la Sesión 52: los webhooks de pago y las cancelaciones Stripe solo se habían validado con tests automatizados (mocks) porque la única escuela con Stripe configurado usa claves LIVE. Ahora hay una forma segura de probarlo con dinero de test.

- **Investigación confirmada:** `School.stripeSecretKey`/`stripePublishableKey`/`stripeWebhookSecret`/`revolutSecretKey`/`revolutPublicKey`/`revolutWebhookSecret` son columnas de texto plano (sin cifrar), `PATCH /api/dashboard/school` no valida formato de clave (aceptaría un `sk_live_` sin problema) — el único guardrail existente es el masking en `GET` (`maskSecret()` en `app/api/dashboard/school/route.ts`)
- **`lib/services/stripeKeyGuard.ts`** (nuevo, con tests) — `assertNotLiveStripeKey()` rechaza cualquier clave `sk_live_`/`pk_live_`/`rk_live_`. Deliberadamente **no** se añadió a la ruta real del dashboard (rompería el guardado de claves live para escuelas reales) — solo se usa en la herramienta nueva de abajo
- **`apps/web/scripts/seed-sandbox-school.ts`** (nuevo) — crea/actualiza una escuela dedicada "Sandbox Payments (Test Only)" con claves `STRIPE_SANDBOX_*` desde `.env`, validadas con el guard de arriba. Modos `--apply` (escribe) y `--cleanup` (borra la escuela y todo lo que cuelga de ella, en orden de dependencias ya que `Membership` no cascada desde `School`); por defecto solo muestra estado, sin escribir — mismo patrón dry-run que `publish-classes.ts`
- **`docs/payment-sandbox-runbook.md`** (nuevo) — procedimiento completo: obtener claves test de Stripe, `stripe listen` para reenviar webhooks a local, crear plan de prueba, y 5 escenarios paso a paso (checkout éxito, checkout fallido, cancel IMMEDIATE, cancel `cancel_at_period_end`, ARCHIVED→FLAGGED usando el hueco entre crear el Checkout Session y pagar). Nota importante documentada: `stripe trigger` **no sirve** para esta app porque no lleva el metadata (`schoolId`/`userId`/`planId`) que el webhook necesita — hay que disparar los eventos a través del flujo real de checkout de la app
- **Revolut: gap documentado, no implementado** — `register-webhook/route.ts` tiene hardcodeado el host de producción de Revolut (`merchant.revolut.com`), sin ningún toggle sandbox. Añadir eso tocaría el código de registro de webhooks y probablemente el schema (`revolutEnvironment` o similar) — deliberadamente dejado fuera de esta PR, documentado como riesgo restante con el enfoque sugerido para una PR futura
- **`.env.example`** — nueva sección `STRIPE_SANDBOX_*` con advertencia explícita de no poner claves live ahí
- **14 tests nuevos** (`stripeKeyGuard.test.ts`) — **251 tests pasando** en total (32 archivos), `check-types` / `lint` / `prisma validate` en verde
- Sin cambios de schema, sin tocar `stripe/route.ts` / `revolut/route.ts` / lógica core de pagos
- **Fix post-PR:** el primer push (`41eff2c`) rompió el build de Vercel — `seed-sandbox-school.ts` importaba `dotenv`, que en este monorepo nunca está declarado como dependencia directa (solo transitivo/hoisted, y de hecho `apps/api` y `apps/prototype` vendorizan cada uno su propia versión distinta), así que la fase de TypeScript de `next build` no podía resolverlo — funcionaba en local "por casualidad" pero no en el entorno limpio de Vercel. Corregido (`896bfa7`) quitando el import y alineando el script con el patrón ya usado por `publish-classes.ts`/`delete-user.ts` (asumir env ya exportado en el shell, `source .env` documentado en el runbook). Verificado corriendo `npm run build` real (no solo `check-types`) antes de repushear
- **Mergeado a `main` en `0c1c7ce`** tras confirmar en verde: build de Vercel Preview (`896bfa7`) y luego el deploy de **Production** (`0c1c7ce`, alias `martial-v2-web.vercel.app`) — logs sin errores, sin ninguna mención a `dotenv`, `Compiled successfully` + `Finished TypeScript` + `Build Completed` + `Deployment completed`; app responde `200` en producción (`<title>Martial — The Global Martial Arts Platform</title>`)
- Branch borrada (local + remoto) tras confirmar el merge

### Sesión 52 — 2026-07-10 ✅
**Migraciones aplicadas en producción + limpieza de duplicados + smoke test real** — `main` en `3228356` (sin cambios de código, solo operación de datos y verificación)

- **Limpieza de `bookings` duplicados:** 38 filas canceladas (36 grupos `(userId, classId, scheduledAt)` con duplicados exactos del import de V1) vía script transaccional revisado y aprobado explícitamente. Verificado tras ejecutar: 0 grupos duplicados activos restantes
- **`npx prisma migrate deploy`:** las 3 migraciones pendientes aplicadas — `20260709090000_bookings_active_slot_unique_index`, `20260709210000_transaction_provider_ref_unique`, `20260710120000_add_transaction_flagged_status`. `migrate status` final: "Database schema is up to date!"
- **Smoke test funcional end-to-end** contra el entorno real (mismo Postgres que usa el deploy), con fixtures aislados (`smoketest_*`) creados y eliminados sin dejar rastro:
  - Reserva normal de clase → 200
  - Doble reserva mismo user/class/scheduledAt → 409 limpio (no 500)
  - Event checkout + event reserve (cash) con `SchoolMember` ARCHIVED → 403 en ambos, sin crear `EventBooking`, sin reactivar `SchoolMember`
  - Dashboard Payments: `Transaction.FLAGGED` visible en el filtro "Needs review" con provider ref + booking ref; `DELETE` sobre esa fila → 403
  - Sin errores en logs del servidor durante toda la sesión
  - Fixtures de prueba (school/class/event/users/Supabase Auth) eliminados al terminar, verificado con `COUNT(*) = 0`
- **Pendiente:** no existe ninguna escuela con clave Stripe/Revolut en modo test/sandbox — el pago capturado con `SchoolMember` ARCHIVED (creación de `Transaction.FLAGGED` vía webhook real) y la política de cancelación Stripe (immediate / `cancel_at_period_end`) siguen validados solo por la suite automatizada (mocks), no por una prueba real con proveedor. Falta configurar un entorno/clave sandbox antes de poder probarlo sin riesgo de dinero real
- `check-types` / `test` (237) / `lint` / `prisma validate` ejecutados de nuevo tras el deploy — todo verde

### Sesión 51 — 2026-07-10 ✅
**Bloquea el checkout de eventos desde el origen para ARCHIVED** — mergeado a `main` en `3228356` (branch `fix/event-checkout-archived-guard`, borrada tras el merge)

Continuación directa de la Sesión 50: esa sesión solo defendía en el webhook (después de que Stripe/Revolut ya hubieran capturado el dinero). Ahora se bloquea antes, igual que ya pasaba con memberships desde antes.

- **`POST /api/my/events/checkout`** — nuevo guard justo después de validar el método de pago disponible: si existe `SchoolMember` para `userId+schoolId` con `status=ARCHIVED`, devuelve 403 con mensaje claro, sin crear `EventBooking`, sin llamar a Stripe (`checkout.sessions.create`) ni a Revolut (`createRevolutOrder`). Mismo patrón exacto que ya usaba `/api/my/checkout` para memberships (inline `prisma.schoolMember.findFirst`, no el helper `isSchoolMemberArchived` de `lib/services/membership.ts`, que está pensado para usarse dentro de una `$transaction` de webhook)
- **`POST /api/my/events/reserve`** (reserva en efectivo, "pay at the door") — mismo guard. Este endpoint también crea un `EventBooking` PENDING (ocupa cupo) sin pasar nunca por Stripe/Revolut/webhook, así que necesitaba el mismo bloqueo por separado. Se añadió `schoolId` al `select` de `event.findUnique` (no estaba seleccionado)
- **Búsqueda exhaustiva confirmada:** solo existen esos dos call sites de `eventBooking.create` en todo `apps/web/app` — no hay un tercer flujo de "ticket gratis" ni un endpoint duplicado que se haya quedado sin cubrir
- **El guard del webhook no se tocó** — sigue siendo necesario como defensa si el staff archiva a alguien entre este check y el webhook de confirmación de pago
- **7 tests nuevos** (`eventCheckoutArchivedGuard.test.ts`) cubriendo ambos endpoints × {ARCHIVED, sin SchoolMember previo, no ARCHIVED} — **237 tests pasando** en total (31 archivos), `check-types` / `lint` / `prisma validate` en verde
- Sin cambios de schema
- **Verificado con `npx prisma migrate status` (solo lectura, sin aplicar nada):** 3 migraciones siguen sin desplegar en la DB — `20260709090000_bookings_active_slot_unique_index`, `20260709210000_transaction_provider_ref_unique`, `20260710120000_add_transaction_flagged_status`. Ninguna se aplicó en esta sesión ni en las anteriores — **sigue pendiente `npx prisma migrate deploy` antes de producción**
- Mergeado a `main` tras confirmación explícita del usuario; branch borrada (local + remoto)

### Sesión 50 — 2026-07-10 ✅
**Cierra el mismo gap de ARCHIVED para pagos de eventos/tickets** — mergeado a `main` en `0c80bd2` (branch `fix/event-payments-archived-member-guard`, borrada tras el merge)

Continuación directa de la Sesión 49: esa sesión solo cubrió memberships. Los event bookings (tickets) pagados vía Stripe/Revolut para un `SchoolMember` ARCHIVED seguían confirmándose sin ningún guard.

- **Stripe (`checkout.session.completed` con `eventBookingId`) y Revolut (`ORDER_COMPLETED` para event ticket)** — si el `SchoolMember` del pagador está ARCHIVED al llegar el pago: el booking se cancela (`EventBooking.status = CANCELLED`, libera el cupo) en vez de confirmarse, no se reactiva `SchoolMember`, y se persiste una `Transaction.FLAGGED` en la misma transacción. Se sigue devolviendo 200
- **Importante:** la rama ARCHIVED nunca cae en la rama de "oversell" del handler (que sí hace refund automático + email de reembolso) — se verificó explícitamente con test que `refunds.create`/`refundRevolutOrder` NO se llaman en el caso ARCHIVED, cumpliendo "no refunds automáticos"
- **`recordFlaggedPayment()` extendido** (`lib/services/transactions.ts`) — nuevos campos opcionales `eventId`, `eventTitle`, `bookingId` (retrocompatible, no rompe las llamadas de membership); usa `Transaction.bookingId` (columna ya existente, sin FK, la misma que usa `recordOnlinePayment` para bookings confirmados) y mete `eventId` en `notes`; categoría `OTHER` para eventos vs `MEMBERSHIP` para planes
- **Dashboard Payments \> Transactions** — el drawer de detalle ahora también muestra "Booking Ref" (antes solo Provider Ref); `GET /api/dashboard/transactions` expone `bookingId`
- **Hallazgo documentado, no resuelto:** `/api/my/events/checkout` (a diferencia de `/api/my/checkout` para memberships) **no bloquea** iniciar un checkout si el `SchoolMember` ya está ARCHIVED — queda como riesgo restante, marcado con `TODO(event-checkout-archived-guard)` en el código; no se tocó por estar fuera del scope explícito de checkout creation flows
- **13 tests nuevos** (`stripeEventBookingArchivedMemberReview.test.ts` nuevo, `revolutWebhookArchivedMemberReview.test.ts` extendido con bloque de event booking) — **230 tests pasando** en total (30 archivos), `check-types` / `lint` / `prisma validate` en verde
- Sin cambios de schema — se reutilizó `TransactionStatus.FLAGGED` y `EventBooking.status` existentes, no hizo falta migración nueva
- Mergeado a `main` tras confirmación explícita del usuario; branch borrada (local + remoto)

### Sesión 49 — 2026-07-10 ✅
**Pagos de membership capturados con SchoolMember ARCHIVED — auditable, no solo log** — mergeado a `main` en `ec924a1` (branch `fix/archived-member-payment-review`, borrada tras el merge)

Continuación directa de la Sesión 48: el guard ARCHIVED de los webhooks Stripe/Revolut solo dejaba un `console.error`. Ahora el caso queda persistido y visible para el admin, sin hacer refund automático.

- **`TransactionStatus.FLAGGED`** — nuevo valor de enum (migración `20260710120000_add_transaction_flagged_status`, `ALTER TYPE ... ADD VALUE`) para marcar "pago capturado, revisión manual pendiente". Nunca cuenta como `totalRevenue` (solo se suman filas `PAID`)
- **`recordFlaggedPayment()`** (`lib/services/transactions.ts`) — crea la `Transaction` FLAGGED con `schoolId`, `userId`, `amount`, `currency`, `paymentMethod`, `stripePaymentIntentId`/`revolutOrderId`, y `planId`+motivo en `notes`. Idempotente igual que `recordOnlinePayment`: pre-check por referencia de proveedor + catch de P2002 — un replay del mismo webhook (Stripe: mismo `event.id`; Revolut: sin event id propio, cada entrega re-evalúa el guard) nunca duplica la fila
- **Webhooks Stripe (`checkout.session.completed`) y Revolut (`ORDER_COMPLETED`)** — cuando el `SchoolMember` ya existe ARCHIVED al llegar el pago: no se crea/activa Membership, no se toca SchoolMember, se llama a `recordFlaggedPayment()` dentro de la misma transacción, y se sigue devolviendo 200
- **Dashboard Payments \> Transactions** (`/dashboard/payments/transactions`) — nuevo tab de filtro "Needs review" + badge naranja + fila detalle muestra Provider Ref (`stripePaymentIntentId`/`revolutOrderId`) y Notes; `GET /api/dashboard/transactions` expone esos dos campos y el conteo `FLAGGED` en `countByStatus`; `DELETE /api/dashboard/transactions/[id]` bloquea borrar filas FLAGGED (perdería el único rastro del caso)
- **No refund automático** — sigue siendo decisión manual del admin (reembolsar en Stripe/Revolut dashboard, o reactivar el SchoolMember y luego usar "Mark as Paid"/activar membership a mano)
- **23 tests nuevos** (`recordFlaggedPayment.test.ts`, extensión de `stripeWebhookLifecycleSync.test.ts`, `revolutWebhookArchivedMemberReview.test.ts`) — **221 tests pasando** en total (29 archivos), `check-types` / `lint` / `prisma validate` en verde
- `prisma generate` ejecutado localmente (sin tocar la DB) para que `TransactionStatus.FLAGGED` exista en el client generado — commit incluye los archivos regenerados en `apps/web/lib/prisma-client/`
- Migración escrita a mano, no aplicada en esta sesión (`prisma migrate deploy` pendiente antes/durante release, igual que en la Sesión 48)
- Mergeado a `main` tras confirmación explícita del usuario; branch borrada (local + remoto)

### Sesión 48 — 2026-07-10 ✅
**Membership lifecycle sync + Stripe cancel policy hardening (P1/P2)** — merge a `main`: `c98fbcb`

> Nota: hay trabajo real entre la Sesión 47 y esta (permisos de dashboard, events/notifications, booking/trial/capacity hardening, check-in/walk-in hardening, payment webhook idempotency — ver commits en GitHub) que no quedó documentado sesión a sesión en este archivo. Esta entrada cubre específicamente el PR de lifecycle sync.

- **Sync `Membership.status` → `SchoolMember.status`** cableado en los 4 webhooks de suscripción de Stripe (`invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `customer.subscription.updated`) — antes solo actualizaban `Membership`, `SchoolMember` quedaba stale:
  - Membership ACTIVE → SchoolMember ACTIVE (si no ARCHIVED)
  - Membership PAUSED → SchoolMember FROZEN (si no ARCHIVED)
  - Membership CANCELLED → SchoolMember INACTIVE (solo si no ARCHIVED **y** no hay otra membership ACTIVE del mismo user+school)
  - **ARCHIVED nunca se reactiva ni se modifica desde ningún webhook** — la decisión de moderación del staff siempre prevalece
- **`customer.subscription.updated` con `cancel_at_period_end=true`** ya no fuerza `Membership.CANCELLED` de inmediato (bug corregido) — mantiene la membership ACTIVE y solo marca `cancelledAt`; sincroniza `endDate` desde `current_period_end` de Stripe cuando Stripe lo aporta
- **`cancelMembership()` — Stripe cancel policy segura**: la llamada a Stripe (`subscriptions.cancel` para IMMEDIATE, `subscriptions.update({cancel_at_period_end:true})` para UNTIL_END_OF_PERIOD) ahora se espera (`await`) *antes* de escribir cualquier estado local; si Stripe falla, no se cambia nada en local — cierra el caso "local CANCELLED pero Stripe sigue cobrando"
- **Guard ARCHIVED entre checkout y webhook** (Stripe `checkout.session.completed` y Revolut `ORDER_COMPLETED`): si `SchoolMember` ya existe ARCHIVED cuando llega el pago confirmado, no se activa la membership ni se crea `Transaction` — el pago ya capturado por Stripe/Revolut **queda para revisión manual** (reembolso o reactivación), logueado con `console.error` con userId/schoolId/planId/paymentIntent
- Helpers nuevos en `lib/services/membership.ts`: `syncSchoolMemberStatusForMembership()`, `hasOtherActiveMembership()`, `isSchoolMemberArchived()`, `cancelStripeSubscription()`
- **28 tests nuevos** (`membershipLifecycleSync.test.ts`, `cancelMembership.test.ts`, `stripeWebhookLifecycleSync.test.ts`) — **209 tests pasando** en total (27 archivos), `check-types` / `lint` / `prisma validate` en verde
- Sin cambios de schema/migraciones, sin cambios de permisos, emails, currency ni UI
- Branch `fix/membership-lifecycle-sync` mergeada a `main` (merge commit `c98fbcb`, base `e5dac89`) y borrada (local + remoto)

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

- **Flujo de agentes desde la Sesión 75:** Claude desarrolla; Codex actúa como Project Audit y no corrige código durante la auditoría. Ver `docs/PROJECT-AUDIT.md` para protocolo, estados y siguiente entrega.
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
