/**
 * One-off manual reconciliation: Barry Russell (bar.russell@icloud.com,
 * Roger Gracie Malaga) paid a real 65 EUR Stripe checkout on 2026-09-08
 * (payment_intent pi_3UDV80K4wL9jsibN0pBSEoSe, product "Mensualidad sin
 * Subscripcion") for his "Jiu Jitsu Mensual" renewal — but our webhook
 * endpoint wasn't subscribed to checkout.session.completed at the time
 * (see scripts/fix-stripe-webhook-enabled-events.ts), so it never landed:
 * his membership was still showing the CASH renewal as pending.
 *
 * This mirrors exactly what markRenewalPaid()/activateMembershipForPaidRenewal()
 * in apps/web/lib/services/membership.ts do for the dashboard's "Mark as
 * paid" button, except it records the real Stripe reference instead of
 * leaving paymentMethod as CASH.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reconcile-barry-russell-stripe-renewal.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/reconcile-barry-russell-stripe-renewal.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import Stripe from 'stripe'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

const PAYMENT_INTENT_ID = 'pi_3UDV80K4wL9jsibN0pBSEoSe'
const PENDING_TRANSACTION_ID = 'cmtky2v7y000104lagwn3i0ua'

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'bar.russell@icloud.com' } })
  if (!user) throw new Error('User not found')
  console.log('User:', user.id, user.name, user.email)

  const existing = await prisma.transaction.findFirst({ where: { stripePaymentIntentId: PAYMENT_INTENT_ID } })
  if (existing) {
    console.log('\nA Transaction for this payment_intent already exists — nothing to do.', existing.id)
    return
  }

  const txn = await prisma.transaction.findUnique({ where: { id: PENDING_TRANSACTION_ID } })
  if (!txn) throw new Error('Pending renewal transaction not found')
  if (txn.userId !== user.id) throw new Error('Transaction does not belong to this user')
  if (txn.status !== 'PENDING') {
    console.log(`\nTransaction status is already ${txn.status} — nothing to do.`)
    return
  }
  if (!txn.membershipId) throw new Error('Transaction has no membershipId')

  const membership = await prisma.membership.findUnique({ where: { id: txn.membershipId } })
  if (!membership) throw new Error('Linked membership not found')

  const school = await prisma.school.findUnique({ where: { id: membership.schoolId }, select: { stripeSecretKey: true } })
  if (!school?.stripeSecretKey) throw new Error('School has no Stripe secret key')
  const stripe = new Stripe(school.stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
  const paymentIntent = await stripe.paymentIntents.retrieve(PAYMENT_INTENT_ID)
  if (paymentIntent.status !== 'succeeded') throw new Error(`PaymentIntent status is ${paymentIntent.status}, not succeeded — aborting`)

  console.log('\nPending renewal transaction:', txn.id, Number(txn.amount), txn.currency,
    'periodStart=', txn.periodStart?.toISOString().slice(0, 10), 'periodEnd=', txn.periodEnd?.toISOString().slice(0, 10))
  console.log('Linked membership:', membership.id, membership.planName, 'status=', membership.status, 'endDate=', membership.endDate?.toISOString().slice(0, 10))

  const newEndDate = txn.periodEnd ?? membership.endDate

  console.log('\nPlanned change:')
  console.log(`  Transaction ${txn.id}: status PENDING -> PAID, paymentMethod CASH -> STRIPE, stripePaymentIntentId=${PAYMENT_INTENT_ID}, date=now`)
  console.log(`  Membership ${membership.id}: status -> ACTIVE, endDate -> ${newEndDate?.toISOString().slice(0, 10)}`)
  console.log(`  SchoolMember -> ACTIVE`)

  if (!LIVE) {
    console.log('\nDry run only. Re-run with --live to apply.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: txn.id },
      data: { status: 'PAID', paymentMethod: 'STRIPE', stripePaymentIntentId: PAYMENT_INTENT_ID, date: new Date() },
    })
    await tx.membership.update({
      where: { id: membership.id },
      data: { status: 'ACTIVE', endDate: newEndDate },
    })
    await tx.schoolMember.updateMany({
      where: { schoolId: membership.schoolId, userId: membership.userId, status: { not: 'ARCHIVED' } },
      data: { status: 'ACTIVE' },
    })
  })

  console.log('\nApplied.')
}

main().finally(() => prisma.$disconnect())
