# Martial App V1 — Laravel Codebase Analysis

> Prepared for: Zeeshan + Claude Code
> Goal: Fully document the V1 Laravel codebase before project closure.
> V2 (Next.js) is already built. This analysis serves as the final migration reference.

---

## Context

**Martial App V1** is the original platform running in production at `martialapp.com`.
Built in **Laravel (PHP)** by **Zeeshan**.

**Martial App V2** is the rebuild in Next.js 16 + Supabase that will replace V1.
V2 was built using V1 as the functional reference.

The goal of this document is to analyze the V1 source code and document everything
in enough detail to:
1. Confirm that V2 covers all V1 functionality
2. Identify gaps — features in V1 not yet in V2
3. Have a complete reference for data migration
4. Close the V1 project in an orderly way

---

## Prompt for Claude Code (paste at the start of the analysis session)

```
Hello. We are going to fully analyze and document the source code of Martial App V1,
a SaaS platform for managing martial arts academies, built in Laravel.

The goal is to generate exhaustive documentation of V1 in order to close the project.
A V2 in Next.js already exists as its replacement, and we need to confirm it covers
everything V1 does.

Please analyze the code and document the following:

---

### 1. DATABASE

- All Eloquent models (name, table, fields, types)
- Relationships between models (hasMany, belongsTo, belongsToMany, etc.)
- Migrations — full structure of each table
- Enums and possible values per field
- Relevant indexes and foreign keys

---

### 2. AUTHENTICATION & ROLES

- Authentication system used (Laravel Auth, Sanctum, Passport, etc.)
- Existing user roles and their permissions
- Authentication and authorization middleware
- SSO / OAuth configured (Google, Facebook, Apple, Microsoft)
- How Student, School Owner, and Superadmin are distinguished

---

### 3. SCHOOL PANEL MODULES (/admin)

For each module, document:
- Routes (GET, POST, PUT, DELETE)
- Responsible controller
- Main business logic
- Form fields / data handled

Known modules:
- Dashboard (KPIs: Users, Upcoming Classes, Leads, Payments, Bookings, Gradings)
- Users (list, create, edit, student profile)
- Classes (list, create, weekly timetable, calendar)
- Memberships (plans, types, prices, duration)
- Payments / Transactions (list, methods: Stripe, Cash, Bank Transfer)
- School (school settings, staff, leads, store, curriculum, waivers, gradings, affiliates)
- Reports (bookings, gradings, payments, balance, absents, users)
- Settings (profile, school, staff, payments, grading system, password)
- Subscription (Martial App plan for the school)
- Notifications
- Support

---

### 4. PAYMENTS SYSTEM

- Stripe integration (webhooks, plans, subscriptions, one-time payments)
- GoCardless integration (even if not in active use)
- Manual methods: Cash, Bank Transfer
- How each transaction is recorded and managed
- Martial App pricing plans (€49.99/mo, €134.99/3mo, €499.99/yr)

---

### 5. MEMBERSHIPS SYSTEM

- Membership types (plan, pass, private, etc.)
- Possible statuses (active, paused, cancelled, expired)
- How a student is assigned to a membership
- Free trial — how it works
- Auto-renewal vs. manual renewal

---

### 6. CLASSES & BOOKINGS SYSTEM

- Class structure (fields, schedule, capacity, instructor)
- Timetable — how the weekly recurring schedule is defined
- Calendar — one-off events vs. recurring classes
- Booking flow: how a student books a class
- Check-in / QR code — how attendance works
- Booking statuses (pending, confirmed, cancelled, no-show, completed)
- Capacity and waitlist

---

### 7. LEADS SYSTEM

- Full lead flow (new → contacted → trial → converted)
- Lead fields
- How leads arrive (web form, manual, other)
- API endpoint: POST /api/createlead (payload, validation, response)
- Notifications on lead creation

---

### 8. GRADINGS SYSTEM

- How the belt/grade system works
- Who can perform a grading
- Grading records per student
- Graduation history

---

### 9. PUBLIC API

- All available public endpoints
- Authentication required per endpoint
- Request and response formats
- Rate limiting or protections

---

### 10. ACADEMY (academy.martialapp.com)

- Course and video structure
- Content categories (Boxing, BJJ, MMA, Muay Thai, Striking, etc.)
- Access model (Bronze/Silver/Gold subscription, individual purchase, free)
- Store (physical and digital products)
- Forums
- Reward points system
- How it connects to the martialapp.com account (SSO or separate account)

---

### 11. EXPLORE (martialapp.com/explore)

- How schools are indexed
- Available filters (discipline, facilities, distance)
- What data is shown per school in the directory
- How a school appears / disappears from explore

---

### 12. JOBS, QUEUES & AUTOMATIONS

- Laravel queue jobs (emails, notifications, recurring payments)
- Scheduled tasks / cron jobs
- Relevant events and listeners
- Incoming webhooks (Stripe, GoCardless)

---

### 13. EMAILS & COMMUNICATIONS

- Emails the platform sends (welcome, invoice, reminder, etc.)
- Email templates
- Email provider (Mailgun, SendGrid, SES, etc.)
- In-app notification system

---

### 14. CONFIGURATION & ENVIRONMENT

- Required environment variables (.env)
- Connected external services
- Laravel project folder structure
- Laravel and PHP version
- Main dependencies (composer.json)

---

### 15. PRODUCTION DATA (with Zeeshan)

- Total active schools and countries
- Total registered users
- Volume of bookings and transactions
- Which schools use Stripe vs. Cash vs. Bank
- Data to migrate to V2 and data to archive

---

## Expected Output

For each section, generate a markdown document with:
- Clear description of how it works
- Data schemas (tables, fields, types)
- Routes and controllers
- Relevant business logic
- Differences or improvements compared to V2

At the end, generate a **V1 vs V2 Gap Analysis**:
- ✅ Functionality covered in V2
- ⚠️ Partially covered
- ❌ V1 functionality not yet in V2
```

---

## Known V1 Data

| | |
|---|---|
| Domain | martialapp.com |
| Stack | Laravel (PHP) |
| Main developer | Zeeshan |
| Active schools | ~20–25 |
| Academy | academy.martialapp.com |
| Pricing | €49.99/mo · €134.99/3mo · €499.99/yr |
| Active payments | Stripe + Cash + Bank Transfer |
| Languages | EN · ES · PT |

**Roger Gracie Málaga (reference school):**
- school_id: 798
- Users: 664
- Bookings: 29,810
- Payments: 3,624
- Gradings: 105
- Upcoming Classes: 39
- Active Leads: 10

---

## Notes for Zeeshan

1. We need access to the Laravel repository (GitHub or zip)
2. We need read access to the production DB (or an anonymized dump)
3. Any existing internal documentation (README, Notion, code comments)
4. Reference environment variables (without sensitive values — names only)
5. If there are tests, review them too — they document expected behavior
