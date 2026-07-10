#!/usr/bin/env tsx
/**
 * seed-sandbox-school.ts — Provisions (or removes) a dedicated, clearly
 * -marked School for smoke-testing Stripe payment webhooks and cancellation
 * flows with TEST-mode keys — no real money, ever.
 *
 * Why this exists: every School stores its own Stripe/Revolut credentials
 * (School.stripeSecretKey etc., see prisma/schema.prisma) and the save API
 * (PATCH /api/dashboard/school) does not validate key format — it will
 * happily store a sk_live_ key. The only school with Stripe configured
 * today uses LIVE keys. This script creates a separate school so payment
 * smoke tests never run against real credentials by accident. See
 * docs/payment-sandbox-runbook.md for the full test procedure.
 *
 * Guardrail: refuses to write any key that looks like a Stripe LIVE-mode
 * key (sk_live_/pk_live_/rk_live_ prefix) — see lib/services/stripeKeyGuard.ts.
 * This check does NOT exist on the real dashboard save route, which must
 * keep accepting live keys for real schools.
 *
 * Usage (needs DATABASE_URL and, for --apply, the STRIPE_SANDBOX_* vars
 * already present in the environment — same expectation as the other
 * scripts in this directory, e.g. `set -a && source .env && set +a` first):
 *   # Status check (default — no writes):
 *   npx tsx apps/web/scripts/seed-sandbox-school.ts
 *
 *   # Create/update the sandbox school from STRIPE_SANDBOX_* env vars:
 *   npx tsx apps/web/scripts/seed-sandbox-school.ts --apply
 *
 *   # Remove the sandbox school and everything under it:
 *   npx tsx apps/web/scripts/seed-sandbox-school.ts --cleanup
 *
 * Required env vars for --apply (see .env.example):
 *   STRIPE_SANDBOX_SECRET_KEY       sk_test_...
 *   STRIPE_SANDBOX_PUBLISHABLE_KEY  pk_test_...
 *   STRIPE_SANDBOX_WEBHOOK_SECRET   whsec_... (from `stripe listen`, see the runbook)
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../lib/prisma-client/client'
import { assertNotLiveStripeKey, LiveStripeKeyError } from '../lib/services/stripeKeyGuard'

const SLUG = 'sandbox-payments-test'
const NAME = 'Sandbox Payments (Test Only)'

const args = process.argv.slice(2)
const APPLY   = args.includes('--apply')
const CLEANUP = args.includes('--cleanup')

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  try {
    const existing = await prisma.school.findUnique({
      where: { slug: SLUG },
      select: { id: true, name: true, stripeSecretKey: true, stripePublishableKey: true, stripeWebhookSecret: true },
    })

    if (CLEANUP) {
      if (!existing) {
        console.log(`No sandbox school found (slug=${SLUG}) — nothing to clean up.`)
        return
      }
      console.log(`Deleting sandbox school "${existing.name}" (${existing.id}) and its dependents...`)
      // Membership doesn't cascade from School (see prisma/schema.prisma) —
      // delete children in dependency order rather than relying on FK
      // defaults, so this works regardless of what those defaults turn out
      // to be for any given relation.
      await prisma.$transaction(async (tx) => {
        await tx.transaction.deleteMany({ where: { schoolId: existing.id } })
        await tx.booking.deleteMany({ where: { class: { schoolId: existing.id } } })
        await tx.eventBooking.deleteMany({ where: { event: { schoolId: existing.id } } })
        await tx.membership.deleteMany({ where: { schoolId: existing.id } })
        await tx.schoolMember.deleteMany({ where: { schoolId: existing.id } })
        await tx.membershipPlan.deleteMany({ where: { schoolId: existing.id } })
        await tx.class.deleteMany({ where: { schoolId: existing.id } })
        await tx.event.deleteMany({ where: { schoolId: existing.id } }) // cascades EventTicket
        await tx.school.delete({ where: { id: existing.id } }) // cascades everything else (see schema)
      })
      console.log('Done. Sandbox school removed.')
      console.log('Note: this does NOT delete any Supabase Auth / User rows you created')
      console.log('while testing (e.g. a test student signup) — see the runbook for how')
      console.log('to find and remove those safely by their test email domain.')
      return
    }

    // ── Status / dry-run ──────────────────────────────────────────────────
    if (!APPLY) {
      console.log('DRY-RUN (no writes) — pass --apply to create/update, --cleanup to remove.\n')
      if (existing) {
        console.log(`Sandbox school already exists: "${existing.name}" (${existing.id})`)
        console.log(`  stripePublishableKey: ${existing.stripePublishableKey ? 'set' : 'not set'}`)
        console.log(`  stripeSecretKey:      ${existing.stripeSecretKey ? 'set' : 'not set'}`)
        console.log(`  stripeWebhookSecret:  ${existing.stripeWebhookSecret ? 'set' : 'not set'}`)
      } else {
        console.log('Sandbox school does not exist yet.')
      }
      return
    }

    // ── Apply ────────────────────────────────────────────────────────────
    const secretKey      = process.env.STRIPE_SANDBOX_SECRET_KEY?.trim()
    const publishableKey = process.env.STRIPE_SANDBOX_PUBLISHABLE_KEY?.trim()
    const webhookSecret  = process.env.STRIPE_SANDBOX_WEBHOOK_SECRET?.trim()

    if (!secretKey || !publishableKey) {
      console.error('Missing STRIPE_SANDBOX_SECRET_KEY and/or STRIPE_SANDBOX_PUBLISHABLE_KEY in .env.')
      console.error('Get test-mode keys from https://dashboard.stripe.com/test/apikeys — see .env.example.')
      process.exitCode = 1
      return
    }

    try {
      assertNotLiveStripeKey(secretKey, 'STRIPE_SANDBOX_SECRET_KEY')
      assertNotLiveStripeKey(publishableKey, 'STRIPE_SANDBOX_PUBLISHABLE_KEY')
    } catch (err) {
      if (err instanceof LiveStripeKeyError) {
        console.error(`REFUSING TO PROCEED: ${err.message}`)
        process.exitCode = 1
        return
      }
      throw err
    }
    // webhookSecret (whsec_...) has no test/live prefix to check — see
    // stripeKeyGuard.ts. STRIPE_SANDBOX_WEBHOOK_SECRET is optional here:
    // `stripe listen` prints a fresh one each run, so you'll typically set
    // it via the dashboard UI per-session rather than once in .env — see
    // the runbook.

    const school = await prisma.school.upsert({
      where: { slug: SLUG },
      create: {
        name: NAME,
        slug: SLUG,
        status: 'VERIFIED',
        city: 'Test',
        country: 'ES',
        language: 'en',
        stripePublishableKey: publishableKey,
        stripeSecretKey: secretKey,
        ...(webhookSecret && { stripeWebhookSecret: webhookSecret }),
      },
      update: {
        stripePublishableKey: publishableKey,
        stripeSecretKey: secretKey,
        ...(webhookSecret && { stripeWebhookSecret: webhookSecret }),
      },
    })

    console.log(`Sandbox school ready: "${school.name}" (${school.id}, slug=${school.slug})`)
    console.log('Next: follow docs/payment-sandbox-runbook.md to create a test student,')
    console.log('a test membership plan, and run `stripe listen` to receive webhooks.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
