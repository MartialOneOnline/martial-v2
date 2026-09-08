/**
 * The Stripe webhook endpoint (we_1MYAWRK4wL9jsibNnm6hau84,
 * https://martialapp.com/api/webhooks/stripe) is missing
 * checkout.session.completed and invoice.payment_failed from its
 * enabled_events — both are event types apps/web/app/api/webhooks/stripe/route.ts
 * explicitly handles. Since Stripe only sends events an endpoint is
 * subscribed to, every one-time payment and every first payment of a
 * subscription (both driven by checkout.session.completed) has never
 * reached our server at all — confirmed via stripe.events.list showing
 * pending_webhooks=0 for two real, unrelated payments (Juan Diaz 2026-09-01,
 * Barry Russell 2026-09-08) that never produced a StripeWebhookEvent row.
 *
 * This adds the two missing event types to the existing endpoint's
 * enabled_events (keeping the ones already there).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/fix-stripe-webhook-enabled-events.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/fix-stripe-webhook-enabled-events.ts --live   # actually apply
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import Stripe from 'stripe'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
]

async function main() {
  const school = await prisma.school.findFirst({
    where: { stripeSecretKey: { not: null } },
    select: { id: true, name: true, stripeSecretKey: true },
  })
  if (!school?.stripeSecretKey) throw new Error('no school with stripe key')

  const stripe = new Stripe(school.stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 })
  const endpoint = endpoints.data.find(e => e.url === 'https://martialapp.com/api/webhooks/stripe')
  if (!endpoint) throw new Error('webhook endpoint not found')

  console.log('Endpoint:', endpoint.id, endpoint.url)
  console.log('Current enabled_events:', endpoint.enabled_events)

  const missing = REQUIRED_EVENTS.filter(e => !endpoint.enabled_events.includes(e))
  if (missing.length === 0) {
    console.log('\nNothing missing — already correct.')
    return
  }
  console.log('\nMissing:', missing)

  const newEvents = Array.from(new Set([...endpoint.enabled_events, ...missing]))
  console.log('New enabled_events would be:', newEvents)

  if (!LIVE) {
    console.log('\nDry run only. Re-run with --live to apply.')
    return
  }

  const updated = await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: newEvents })
  console.log('\nApplied. enabled_events now:', updated.enabled_events)
}

main().finally(() => prisma.$disconnect())
