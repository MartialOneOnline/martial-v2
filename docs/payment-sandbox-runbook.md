# Payment sandbox runbook

How to smoke-test Stripe/Revolut payment webhooks and cancellation flows
**without real money** — and without any risk of accidentally hitting the
one school that has real LIVE Stripe credentials configured today.

## Why this exists

Every `School` stores its own payment credentials directly on the row
(`prisma/schema.prisma`):

```prisma
stripePublishableKey String?
stripeSecretKey      String?
stripeWebhookSecret  String?
revolutPublicKey     String?
revolutSecretKey     String?
revolutWebhookSecret String?
```

These are **plaintext columns**, and the save endpoint
(`PATCH /api/dashboard/school`) does **no format validation** — it will
store whatever string you give it, live key or not. As of this writing,
exactly one school ("Roger Gracie Malaga") has Stripe configured, and it's
a **live-mode** (`sk_live_...`) key. There is no school with test-mode keys.
That's the gap this runbook and its tooling close.

**Golden rule: never run any of the steps below against a school that has
a `sk_live_`/`pk_live_` key.** The seed script in this runbook refuses to
write one, but that only protects the sandbox school it creates — always
double-check which school you're pointed at before triggering a real
checkout flow.

## Part 1 — Provision the sandbox school

### 1.1 Get Stripe test-mode keys

1. Log into the [Stripe Dashboard](https://dashboard.stripe.com), toggle
   **Test mode** on (top-right).
2. Go to **Developers → API keys** (or
   [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
   directly) and copy the **Publishable key** (`pk_test_...`) and
   **Secret key** (`sk_test_...`).

### 1.2 Set the env vars

In your local `.env` (never commit this), fill in the `STRIPE_SANDBOX_*`
block added to `.env.example`:

```env
STRIPE_SANDBOX_SECRET_KEY="sk_test_..."
STRIPE_SANDBOX_PUBLISHABLE_KEY="pk_test_..."
```

Leave `STRIPE_SANDBOX_WEBHOOK_SECRET` empty for now — you'll get a fresh
one from `stripe listen` in Part 2, and it's usually easier to paste that
into the dashboard UI per test session (see 2.2) than to keep it in `.env`.

### 1.3 Run the seed script

From the repo root:

```bash
# Check current state (no writes):
npx tsx apps/web/scripts/seed-sandbox-school.ts

# Create/update the sandbox school:
npx tsx apps/web/scripts/seed-sandbox-school.ts --apply
```

This creates (or updates) a school named **"Sandbox Payments (Test Only)"**
(slug `sandbox-payments-test`) with your test-mode keys. The script refuses
to run — with a clear error — if either key looks like a live-mode key
(`sk_live_`/`pk_live_` prefix). See `lib/services/stripeKeyGuard.ts`.

### 1.4 Get dashboard access to the sandbox school

The school is created directly in the DB, so no one owns it yet. Easiest
path for local dev — make your own dev user its `OWNER`:

```bash
npx tsx -e "
import { prisma } from './apps/web/lib/db'
const email = 'YOUR_DEV_EMAIL_HERE'
const school = await prisma.school.findUniqueOrThrow({ where: { slug: 'sandbox-payments-test' } })
const user = await prisma.user.findUniqueOrThrow({ where: { email } })
await prisma.schoolMember.upsert({
  where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
  create: { schoolId: school.id, userId: user.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
  update: { role: 'OWNER', status: 'ACTIVE' },
})
console.log('Done — you are now OWNER of', school.name)
"
```

(Same pattern as the existing `scripts/set-superadmin.ts` — reused here
rather than adding a new script, since it's a one-off snippet.)
Alternatively, if your account already has `role: 'SUPERADMIN'`,
you can reach any school's dashboard without this step
(`lib/auth/server.ts:requireDashboardAccess` bypasses the membership check
for superadmins) — you'll still need to select the sandbox school as your
current dashboard context (school switcher, or `currentSchoolId` cookie).

Log in, go to **Settings → Payments**, and confirm you see "Stripe
connected" with a masked key ending in the last 4 characters of your test
key — this confirms the dashboard is reading the sandbox school's row, not
the live one.

### 1.5 Create a test membership plan

In the dashboard (**Memberships** page), create one plan for the sandbox
school — e.g. "Test Monthly", price €1.00, `SUBSCRIPTION`, monthly billing,
payment method `STRIPE`. Use a trivial price so any test-mode charge
(should there ever be a mixup) is inconsequential — although in test mode
**no real card is ever charged regardless of price**.

## Part 2 — Receive webhooks locally

### 2.1 Install the Stripe CLI

```bash
brew install stripe/stripe-cli/stripe   # or see https://stripe.com/docs/stripe-cli
stripe login
```

### 2.2 Forward webhooks to your local dev server

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This prints a signing secret like `whsec_...` — **paste that into the
sandbox school's Settings → Payments → Stripe Webhook Secret field** (not
`.env`) before triggering anything. Leave this terminal running for the
whole test session; it forwards every test-mode event on your account to
your local endpoint.

⚠️ **Important:** `stripe trigger <event>` (the CLI's canned-event
simulator) does **not** work for testing this app's webhook handlers
end-to-end. Our `checkout.session.completed` handler reads
`session.metadata.schoolId/userId/planId` to know what to activate — those
are set by `/api/my/checkout` when it creates the real Checkout Session.
`stripe trigger` fabricates its own generic fixture object with none of
that metadata, so the handler will 400 ("Missing schoolId in metadata") or
silently no-op. **Always drive these tests through the app's real checkout
flow**, described below — `stripe listen` just needs to be running so the
*real* event Stripe sends back reaches your local server.

## Part 3 — Test scenarios

All scenarios assume: `stripe listen` running (2.2), a test student user
(sign up normally in the app with an obviously-fake email like
`sandbox-test-student@example.invalid`), and the test plan from 1.5.

### A. Checkout success → Membership ACTIVE + Transaction PAID

1. As the test student, subscribe to the test plan (via the UI:
   `/school/sandbox-payments-test`, or directly:
   `POST /api/my/checkout {"planId": "<planId>", "provider": "STRIPE"}`).
2. On the Stripe Checkout page, pay with the test card **`4242 4242 4242
   4242`**, any future expiry, any CVC.
3. Confirm: redirected to `success_url`; `stripe listen`'s terminal shows
   `checkout.session.completed` forwarded with a `200` response; a new
   `Membership` (status `ACTIVE`) and `Transaction` (status `PAID`) exist
   for the test student in the sandbox school.

### B. Checkout failure → nothing activated

1. Same as A, but pay with the test card **`4000 0000 0000 0002`**
   (generic decline) — Stripe rejects it on its own page, the Checkout
   Session never completes, so `checkout.session.completed` never fires.
2. Confirm: no `Membership` or `Transaction` was created. This exercises
   the "payment never succeeded" path, not a webhook at all — there's
   nothing for our handler to do, which is the correct behavior.

### C. Cancel — IMMEDIATE policy

1. Set the sandbox school's `cancelPolicy` to `IMMEDIATE` (dashboard
   Settings, or `prisma.school.update`).
2. Complete scenario A to get an active subscription.
3. As the test student, cancel it (`/my/membership` → Cancel, or
   `PATCH /api/my/memberships/[id] {"action":"cancel"}`).
4. `cancelMembership()` (`lib/services/membership.ts`) calls
   `stripe.subscriptions.cancel()` **and awaits it before writing any local
   state** — confirm in the Stripe Dashboard (test mode) that the
   subscription shows **Canceled**, then confirm locally that
   `Membership.status = CANCELLED` and `SchoolMember.status = INACTIVE`
   (unless another active membership covers the same user+school).
5. The failure path (Stripe API rejects the cancel call, local state must
   stay untouched) is **not** exercised live here — forcing a live API
   failure on demand isn't practical to script safely. That path is
   covered by `apps/web/__tests__/cancelMembership.test.ts` (mocked
   Stripe failure, asserts zero local writes).

### D. Cancel — UNTIL_END_OF_PERIOD policy (Netflix model)

1. Set `cancelPolicy` to `UNTIL_END_OF_PERIOD`.
2. Complete scenario A again (fresh subscription).
3. Cancel as in C.3.
4. Confirm in the Stripe Dashboard: subscription still **Active**, with
   **"Cancels on <date>"** shown (`cancel_at_period_end: true`).
5. Confirm locally: `Membership.status` is still `ACTIVE`,
   `Membership.cancelledAt` is set, `SchoolMember.status` is unchanged —
   access continues until the period ends. (Optional, slow: let a Stripe
   **test clock** advance past the period end to observe the real
   `customer.subscription.deleted` webhook flip it to `CANCELLED` — see
   [Stripe test clocks](https://stripe.com/docs/billing/testing/test-clocks).)

### E. ARCHIVED member payment → Transaction.FLAGGED, no access granted

This is the case the last few PRs hardened: a payment succeeds after the
payer's `SchoolMember` was archived. To reproduce it with test money only,
exploit the natural gap between "Checkout Session created" and "payment
submitted" — there's no time pressure on Stripe's Checkout page:

1. As the test student, start checkout (scenario A.1) but **don't pay
   yet** — leave the Stripe Checkout tab open.
2. In another tab, as the school owner/admin, archive the test student's
   `SchoolMember` for the sandbox school (dashboard Users page → Archive).
3. Now go back and complete the payment with `4242 4242 4242 4242`.
4. Confirm: **no** `Membership` is created, the `SchoolMember` stays
   `ARCHIVED` (not reactivated), and a `Transaction` with
   `status = FLAGGED` appears — check the dashboard **Payments →
   Transactions → "Needs review"** tab, confirm it shows the Stripe
   `paymentIntent` reference and the plan name in Notes.
5. Repeat step 3's webhook delivery (Stripe's own automatic retry, or
   resend it manually from the Stripe Dashboard's webhook event log) and
   confirm the `Transaction` count doesn't double — idempotency, per
   `recordFlaggedPayment()`.

For the equivalent **event ticket** flow, replace "subscribe to a plan"
with "buy a ticket to a test event" (`/api/my/events/checkout`) — same
archive-before-paying trick, same expected outcome (booking `CANCELLED`,
`Transaction.FLAGGED`, no ticket).

## Part 4 — Revolut: sandbox not available yet (known gap)

Revolut sandbox testing is **not wired into this app today** — flagging
this clearly rather than building it in this PR (out of scope: it would
touch the webhook-registration code path, not just tooling/docs).

What's blocking it: `POST /api/dashboard/revolut/register-webhook`
(`apps/web/app/api/dashboard/revolut/register-webhook/route.ts`) hardcodes
the **production** Revolut Merchant API host
(`https://merchant.revolut.com/api/1.0`). Revolut's sandbox environment
lives at a different host (`https://sandbox-merchant.revolut.com`), and
nothing in the codebase switches between them — there's no
`revolutEnvironment` field on `School`, no env-based toggle, nothing.

A real Revolut sandbox merchant account's secret key pointed at the
current code would have its webhook-registration call rejected by the
production API (wrong host for a sandbox key), so this can't be worked
around from the outside.

**Suggested future approach** (not implemented here): add a small
`revolutSandbox: Boolean @default(false)` field to `School`, branch
`REVOLUT_API` in `register-webhook/route.ts` (and the equivalent check in
`lib/revolut.ts` if order-creation also hardcodes the host) on that flag.
That's a real schema change and touches the webhook registration code
path — deliberately left for a dedicated follow-up PR rather than bundled
into this docs/tooling change.

## Part 5 — Cleanup

```bash
# Remove the sandbox school and everything under it (memberships,
# transactions, bookings, classes, events, school members, plans):
npx tsx apps/web/scripts/seed-sandbox-school.ts --cleanup
```

This does **not** delete the test student's `User` row or their Supabase
Auth account (users aren't scoped to one school). To remove those too —
find them by your test email domain and delete both the Prisma `User` row
and the matching Supabase Auth user via the Admin API
(`DELETE {SUPABASE_URL}/auth/v1/admin/users/{id}` with the service role
key) — the same pattern used for the smoke-test fixtures in the
2026-07-10 session (see `CONTEXT.md`, Sesión 52).

Stop `stripe listen` (Ctrl-C) when you're done — no cleanup needed on the
Stripe side; test-mode data doesn't cost anything and Stripe purges old
test objects on its own schedule.

## Safety checklist before running any of this

- [ ] `STRIPE_SANDBOX_SECRET_KEY` starts with `sk_test_`, not `sk_live_`
- [ ] The dashboard Settings page you're looking at says **"Sandbox
      Payments (Test Only)"**, not a real school name
- [ ] `stripe listen` is running against **your** Stripe account in test
      mode (check the CLI's own login state with `stripe config --list`)
- [ ] You're using Stripe's published test card numbers, never a real card
