# Martial App V1 — Project Closure Context

> This file is the shared memory of the V1 closure project.
> Update it at the START and END of every work session.
> Pass it in full at the beginning of any conversation with Claude Code or Zeeshan.
> Works across different computers and collaborators.

---

## Project Overview

**Goal:** Fully document and professionally close Martial App V1 before V2 takes over.

**V1:** `martialapp.com` — Laravel (PHP) — built by Zeeshan — production active  
**V2:** `martial-v2-web.vercel.app` — Next.js 16 + Supabase — built by Pablo + Claude — separate repo, no interference until complete  
**Academy:** `academy.martialapp.com` — video courses, content platform  

---

## Team

| Person | Role |
|---|---|
| Pablo | Product owner, V2 lead |
| Zeeshan | Laravel developer, V1 main developer — knows the full platform |
| Claude Code | Documentation, analysis, V2 development assistant |

**Working method:** Different computers. Context is shared via this file.

---

## V1 Platform — What Exists

### Domains
| Domain | Purpose | Status |
|---|---|---|
| martialapp.com | Main app — schools + students | ✅ Production |
| martialapp.com/explore | Public school directory | ✅ Live |
| martialapp.com/admin | School management panel | ✅ Live |
| academy.martialapp.com | Video courses + content | ✅ Live |

### Stack
- **Backend:** Laravel (PHP)
- **Auth:** Email + SSO (Google, Facebook, Apple, Microsoft)
- **Languages:** EN · ES · PT
- **Payments:** Stripe ✅ · Cash ✅ · Bank Transfer ✅ · GoCardless (integrated, not used)
- **Apps:** App Store · Google Play · Huawei Store

### Pricing (Martial App subscription for schools)
- Monthly: €49.99
- 3 Months: €134.99
- Annual: €499.99
- Free trial: 30 days

### Active Schools
- ~20–25 schools active on the platform

### Reference School — Roger Gracie Málaga
- school_id (V1): `798` · school_id (V2): `cmq6k2n5t0000x4o0rcvlmhmv`
- Users: 727 (127 ACTIVE)
- Bookings: 42,379
- Payments (transactions): 3,779
- Gradings: 339
- **Fully synced V1 → V2 as of 2026-08-09** — see Session 2026-08-09 log entry below. Reference/pilot school for the V1 import pipeline.

---

## School Panel (/admin) — Known Modules

| Module | Description |
|---|---|
| Dashboard | KPIs: Users, Upcoming Classes, Leads, Payments, Bookings, Gradings + Latest Transactions + Upcoming Classes widget |
| Users | Student list, profiles, management |
| Classes | List, timetable (weekly), calendar, events |
| Memberships | Plans, types, prices, duration |
| Payments | Transactions + subscriptions (Stripe, Cash, Bank Transfer) |
| School | Staff, leads, store, curriculum, waivers, gradings, affiliates |
| Reports | Bookings, gradings, payments, balance, absents, users |
| Settings | Profile, school, staff, payments, grading system, password |
| Subscription | Martial App plan for the school |
| Notifications | In-app notifications |
| Support | Support tickets |

### Dashboard top bar
- Global search
- Real-time date and time
- Notifications bell
- Language selector (EN/ES/PT)

### School quick actions (top right panel)
- Invite user · Send · QR code · More (···)

---

## Academy (academy.martialapp.com) — Known Features

### Navigation
Categories · Home · Courses · Instructors · Store · Forums + shopping cart

### Content Categories
- Disciplines: Boxing, Muay Thai, MMA, Brazilian Jiu-Jitsu
- Technique: Striking, Takedowns, Ground Game
- Fitness: Strength & Conditioning, Lifestyle, Health & Fitness, Nutrition

### Course Types
Newest · Trending · Featured · Best-rated · Bestselling · Free · Discounted · Bundles

### Access Model
- Individual course purchase
- Free courses
- Subscriptions: Bronze €20 · Silver €40 · Gold €100

### Additional Features
- Store (physical + digital products, e-books)
- Forums (community)
- Blog
- Instructor Finder
- Reward points
- Testimonials
- Organizations

### Current Stats (live)
10 instructors · 10 students · 9 live classes · 8 video courses

---

## Explore (martialapp.com/explore) — Known Features

- 30+ schools listed globally
- Filters: Discipline (20+ martial arts) · Facilities (Wi-Fi, Parking, Showers, Sauna...) · Distance (1–25km+)
- School card: photo, name, disciplines, address, description, instructors
- Reset Search button

---

## Known API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/createlead` | POST | Creates a lead/student from an external school website |

**createlead payload:**
```json
{
  "school_id": 798,
  "first_name": "...",
  "last_name": "...",
  "email": "...",
  "phone": "...",
  "gender": "male",
  "register_on": "YYYY-MM-DD",
  "dob": "YYYY-MM-DD",
  "address": "...",
  "language": "es"
}
```

---

## Closure Deliverables

### 1. Technical Documentation
Complete technical write-up of the V1 Laravel codebase:
- Database models, tables, fields, relationships
- Routes, controllers, business logic
- Payment integrations (Stripe, GoCardless, Cash, Bank)
- API endpoints
- Jobs, queues, cron jobs, automations
- Email templates and providers
- Environment config and external services

### 2. Feature & Functionality Documentation
Full map of every feature and module:
- School panel (all modules)
- Student-facing side (/my area)
- Superadmin panel
- Academy platform
- Explore directory
- Mobile app

### 3. User Manual
Written guide for non-technical users:
- How a school owner uses the dashboard
- How a student books a class
- How the Academy works
- How payments are processed

### 4. V1 vs V2 Gap Analysis
- ✅ Covered in V2
- ⚠️ Partially covered
- ❌ Not yet in V2

---

## Open Questions (need Zeeshan)

- [ ] Laravel repo access (GitHub or zip)
- [ ] Production DB access (read-only or anonymized dump)
- [x] Mobile app — **WebView** (wraps the web app, no separate codebase)
- [ ] Superadmin panel — full module list and capabilities
- [ ] Student-facing panel — what does a logged-in student see and do?
- [ ] Infrastructure — servers, hosting, DNS, SSL, cron jobs
- [ ] Credentials handoff list — Stripe keys, email provider, DB, etc.
- [ ] Which schools use Stripe vs Cash vs Bank Transfer
- [ ] Academy — is it a separate codebase or same Laravel repo?
- [ ] Academy — connection to martialapp.com account (SSO or separate login?)

---

## Transition Plan (to define)

- [ ] School migration order and timeline
- [ ] Communication plan for active schools
- [ ] `/api/createlead` endpoint — must be replicated in V2 before V1 shuts down
- [ ] Parallel running period (V1 + V2 live at the same time)
- [ ] V1 shutdown date

---

## Session Log

### Session 2026-08-09 — RGA V1 → V2 data sync + reusable import scripts

**Trigger:** students migrated from V1 had no V2 login — investigating how to invite them
surfaced that the V1 → V2 import for Roger Gracie Málaga (the pilot/reference school) was
badly out of sync across four areas, not just auth.

**Found & fixed (all applied live to production, RGA only):**
- **Member status** — `sync-rga-members.mjs` set every imported student to `ACTIVE`
  regardless of V1's real `member_status`; corrected 53 members (`fix-rga-active-status.mjs`),
  bringing RGA's ACTIVE count from 73 to the real ~124-126.
- **Membership renewals** — `Membership` records were created once and never refreshed on
  renewal; 91 currently-ACTIVE students showed `EXPIRED`/`CANCELLED` despite paying and
  training. New script `refresh-v1-memberships.mjs` refreshed 103 memberships from each
  user's latest V1 booking.
- **Attendance** — `sync-rga-attendance.mjs` had a backlog (1,093 + a later 144 rows);
  re-ran and it's current.
- **Belt/grade** — cross-checked V1's own "Gradings" report (exported directly from the V1
  admin panel) against V2 and found **186 of 464 matched students (40%) had the wrong
  belt/degree** — the dominant pattern (45% of mismatches) was V2 sitting exactly one
  stripe behind V1 in the same color, consistent with an off-by-one bug in the original
  `userdetails.belts` JSON resolution. 67 mismatches were a fully wrong belt *color*, 20 on
  currently-ACTIVE students (e.g. two black belts showing as brown). Fixed with
  `fix-rga-belt-grades.mjs`, using the V1 report as source of truth.
- **Avatars** — the only prior script (`upload-avatars.{mjs,ts}`) read a static student
  snapshot from June and an old CSV, so anyone added/reactivated since was never attempted.
  Replaced with `sync-v1-avatars.mjs` (queries the roster live, resizes oversized V1 photo
  exports with `sharp` before upload — V1's raw phone-camera exports routinely exceed the
  app's 5MB avatar limit). Recovered 124 more avatars once a fuller V1 photo export
  (`student.zip`) was provided.

**Generalized for the next school migration:** `sync-rga-members.mjs` → `sync-v1-members.mjs`
and `sync-rga-payments.mjs` → `sync-v1-payments.mjs` now take `--school-id` / `--v1-school-id`
/ `--csv-dir` instead of hardcoded constants, and auto-detect the latest CSV per table
(V1's export panel increments a `(N)` suffix each re-export). `sync-rga-attendance.mjs`
is **not yet generalized** — it has a hand-built V1-class-id → V2-class-id map specific to
RGA's 10 classes that would need redoing per school.

**Commit:** `75204e6` — "fix(v1-import): generalize member/payment sync scripts, fix
status/membership/belt import bugs for RGA" (pushed to `origin/main`).

**Open / not done:**
- Grading *history* (`promote_students` V1 log, not just current belt) is still ambiguous —
  81% of rows have `next_belt_id = 0`, meaning unclear; theory is "reviewed, not promoted"
  but unconfirmed. 339 `Grading` records already exist in V2 from an earlier undocumented
  import (2026-06-22) and cover everything unambiguously resolvable; left as-is.
  `scripts/rga-gradings-report.csv` (hand-transcribed from the V1 PDF report) is the closest
  thing to ground truth if this gets picked up again.
- ~125 students' V1 profile photos still aren't in any local export (filenames carry
  2025/2026 date stamps — uploaded to V1 after every local photo folder we've been given
  was captured); needs a fresher photo export from V1 to close.
- Next school to run the generalized pipeline on: not yet chosen.

### Session 1 — 2026-06-12
- Defined project closure goal
- Documented V1 context: domains, stack, school panel, Academy, Explore, payments
- Identified Roger Gracie Málaga as reference school (school_id 798)
- Created analysis prompt for Laravel codebase (`docs/v1-laravel-analysis.md`)
- Identified open questions and missing areas: mobile app, student panel, superadmin, infrastructure, credentials, transition plan
- Created this shared context file

---

## How to Use This File

1. **At the start of every session** — paste this file into the conversation
2. **At the end of every session** — update the Session Log and any sections that changed
3. **When sharing with Zeeshan** — send this file so he has full context before starting
4. **When switching computers** — this file is the single source of truth
