# CONTEXT — Martial App V2

> Este archivo es la memoria del proyecto.
> Actualízalo al INICIO y al FINAL de cada sesión de trabajo.
> Pégalo completo al inicio de cualquier conversación con IA.

---

## Proyecto

**Nombre:** Martial App V2  
**Repo:** https://github.com/MartialOneOnline/martial-v2  
**Rama principal:** main  
**Estado:** Fase 1 · Sesión 1 — documentación base

---

## Dominios

| Entorno | Dominio | Estado |
|---|---|---|
| Producción actual Laravel | martialapp.com | ✅ No tocar |
| Explore actual | martialapp.com/explore | ✅ No tocar |
| Academy actual | academy.martialapp.com | ✅ No tocar |
| Web V2 | martialapp.online | 🔧 En construcción |
| Dashboard V2 | app.martialapp.online | 🔧 En construcción |
| API V2 | api.martialapp.online | 🔧 En construcción |

---

## Stack decidido

| Capa | Tecnología |
|---|---|
| Web / Admin / Explore | Next.js App Router |
| Mobile | Expo + React Native |
| API | Node.js + Express |
| ORM | Prisma |
| Base de datos | PostgreSQL — Supabase |
| Auth | Supabase Auth para web, mobile y API |
| Estilos web | Tailwind CSS + Shadcn/ui |
| Estilos mobile | NativeWind, más adelante |
| Monorepo | Turborepo |
| Emails | Resend, pendiente |
| Pagos | Stripe, solo modo test y no antes de Fase 5 |
| Imágenes | Cloudinary, pendiente |
| Hosting web | Vercel |
| Hosting API | Railway o Render |
| Repo | GitHub — MartialOneOnline/martial-v2 |

Nota: el template inicial de Turborepo instaló Next.js 16.2.0. Para evitar depender de una versión concreta en la documentación, usamos “Next.js App Router” como decisión técnica.

---

## Arquitectura de carpetas actual

Estructura creada automáticamente por Turborepo:

```txt
martial-v2/
├── apps/
│   ├── web/        ← Next.js, existe y funciona en localhost:3000
│   └── docs/       ← app de ejemplo creada por Turborepo, se reemplazará más adelante
├── packages/
│   ├── ui/                 ← paquete compartido creado por Turborepo
│   ├── eslint-config/      ← configuración ESLint compartida
│   └── typescript-config/  ← configuración TypeScript compartida
├── CONTEXT.md
├── .env.example
├── README.md
├── package.json
├── package-lock.json
├── turbo.json
└── node_modules/
```

---

## Arquitectura de carpetas objetivo

```txt
martial-v2/
├── apps/
│   ├── web/        ← Next.js para landing, Explore y dashboard
│   ├── mobile/     ← Expo / React Native, se creará en Sesión 2
│   └── api/        ← Node.js + Express, se creará en Sesión 2
├── packages/
│   ├── ui/                 ← componentes compartidos / design tokens
│   ├── types/              ← tipos TypeScript compartidos, futuro
│   ├── validators/         ← schemas de validación compartidos, futuro
│   ├── eslint-config/      ← configuración ESLint compartida
│   └── typescript-config/  ← configuración TypeScript compartida
├── prisma/         ← schema y migraciones, Sesión 3
├── docs/           ← documentos de planificación, pendiente
├── CONTEXT.md
├── .env.example
├── turbo.json
└── package.json
```

---

## Producto objetivo

Martial App V2 tendrá cuatro áreas principales.

### 1. Public Website / Explore

- Landing pública
- Buscar academias
- Buscar clases
- Ofertas
- Perfiles públicos de academias
- SEO

### 2. School Admin Dashboard

- Dashboard
- School profile
- Branches
- Instructors / staff
- Timetable
- Classes
- Students
- Memberships
- Payments
- Transactions
- Attendance
- Reports
- QR attendance
- Settings

### 3. Mobile App / Member App

- Profile
- Bookings
- Subscriptions
- Ranking
- Schedule
- Notifications
- Payments
- Waivers
- QR scanner
- Explore / offers

### 4. Academy

- Fuera de scope por ahora
- Mantener separada
- Posible identity link o SSO en Fase 7
- No fusionar con Martial App V2 todavía

---

## Estado actual — Fase 1 · Sesión 1

### Completado

- [x] Node.js v24.16.0 instalado
- [x] npm v11.13.0 instalado
- [x] Git v2.39.5 instalado
- [x] Repo GitHub creado: MartialOneOnline/martial-v2
- [x] Monorepo creado con Turborepo
- [x] Push inicial a main completado
- [x] `npm run dev` funciona localmente
- [x] apps/web funciona en http://localhost:3000
- [x] apps/docs funciona en http://localhost:3001
- [x] `git status` limpio después del push inicial

### Mini-paso actual

- [x] Crear CONTEXT.md en la raíz
- [x] Crear .env.example en la raíz
- [ ] Commit: `docs: add project context and env example`
- [ ] Push a GitHub

---

## Próximas sesiones

### Sesión 2 — Estructura técnica mínima

Objetivo: preparar las apps reales del monorepo sin lógica de negocio.

- [ ] Reemplazar `apps/docs` por `apps/mobile`
- [ ] Crear `apps/mobile` con Expo instalado desde el principio
- [ ] `apps/mobile` solo tendrá una pantalla mínima “coming soon”
- [ ] Crear `apps/api` con Node.js + Express
- [ ] Crear endpoint `GET /health`
- [ ] Confirmar que `apps/api` responde en `localhost:4000`
- [ ] Commit pequeño y push

### Sesión 3 — Base de datos

Objetivo: conectar Supabase y Prisma.

- [ ] Crear proyecto Supabase
- [ ] Configurar variables de entorno locales
- [ ] Instalar y configurar Prisma
- [ ] Crear schema inicial con `User` y `School`
- [ ] Primera migración o `db push`
- [ ] Confirmar conexión con Supabase
- [ ] Commit pequeño y push

### Sesión 4 — Auth básica

Objetivo: login/register básico usando Supabase Auth.

- [ ] Configurar Supabase Auth
- [ ] Crear login básico en web
- [ ] Crear register básico en web
- [ ] Crear dashboard vacío protegido
- [ ] Confirmar que usuarios pueden entrar y salir
- [ ] Commit pequeño y push

---

## Decisiones confirmadas

1. Supabase Auth será el sistema único de autenticación para web, mobile y API.
2. Usaremos monorepo con Turborepo.
3. Usaremos PostgreSQL en Supabase como base de datos inicial.
4. Usaremos Prisma como ORM.
5. Usaremos Next.js App Router para web, dashboard y Explore.
6. Usaremos Expo / React Native para app móvil real.
7. Usaremos Node.js + Express para la API.
8. Stripe solo se trabajará en modo test y no antes de Fase 5.
9. Academy se mantiene separada hasta una fase futura.
10. martialapp.com Laravel no se toca; se usa como referencia funcional.
11. API primero: ningún frontend serio sin endpoint correspondiente.
12. apps/mobile existirá desde Fase 1/Sesión 2 con Expo instalado, pero sin pantallas reales.

---

## Reglas de trabajo

- Un módulo a la vez.
- Commits pequeños y frecuentes.
- No usar `git add .` si solo queremos subir archivos concretos.
- Si no entiendo el código que generó la IA, no lo despliego.
- El schema de Prisma no se cambia sin pensarlo bien.
- No mezclar Academy con la app principal todavía.
- No construir pagos ni memberships en fases iniciales.
- No migrar datos reales todavía.
- Mantener `CONTEXT.md` actualizado.
- Usar Laravel actual como referencia de negocio, no como código a copiar sin criterio.
- Usar Figma/CSS actual como referencia visual, pero construir un Design System limpio.

---

## Lo que NO se construye todavía

- Pagos reales
- Stripe webhooks
- Memberships
- Trials
- GoCardless
- Redsys
- Reports
- Gradings
- Notificaciones push
- SMS
- Login unificado con Academy
- Migración de datos reales
- Cambios en martialapp.com producción

---

## Historial de sesiones

### 2026-05-27 — Sesión 1

**Hecho:**

- Preparado entorno local en Mac
- Instalado Node.js, npm y Git
- Creado repositorio GitHub privado
- Creado monorepo Turborepo
- Subido push inicial a main
- Probado `npm run dev`
- Confirmado web en localhost:3000
- Confirmado docs en localhost:3001
- Preparados `CONTEXT.md` y `.env.example`

**Funciona:**

- Repo GitHub conectado
- Branch main conectado con origin/main
- Turborepo arranca localmente
- apps/web responde en localhost:3000
- apps/docs responde en localhost:3001

**Próximo paso:**

- Commit y push de `CONTEXT.md` y `.env.example`
- Después, Sesión 2: crear `apps/mobile` y `apps/api`

---

## Referencias

- Supabase dashboard: https://supabase.com/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- Railway dashboard: https://railway.app/dashboard
- GitHub repo: https://github.com/MartialOneOnline/martial-v2
- Documentos de planificación: carpeta `/docs` del repo, pendiente de subir
