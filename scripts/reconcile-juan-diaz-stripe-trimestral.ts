/**
 * One-off manual reconciliation: Juan Diaz (diazjuand@gmail.com, Roger
 * Gracie Malaga) paid a real 180 EUR Stripe subscription for "Jiu Jitsu
 * Trimestral" on 2026-09-01 (payment_intent pi_3UAwaeK4wL9jsibN1lrbOT6X,
 * subscription sub_1UAwamK4wL9jsibNsmpgHo1d) via a Stripe object that
 * carried none of our checkout metadata (schoolId/userId/planId) — most
 * likely created outside /api/my/checkout (Stripe Dashboard / Payment
 * Link). Our webhook at apps/web/app/api/webhooks/stripe/route.ts requires
 * that metadata (or a pre-existing Membership.stripeSubId match) to resolve
 * which school's secret to verify the signature with, so it 400'd before
 * ever claiming the event — no StripeWebhookEvent row, no Membership, no
 * Transaction. This script performs, by hand, exactly what
 * checkout.session.completed would have done, sourcing the real period
 * dates from Stripe itself.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reconcile-juan-diaz-stripe-trimestral.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/reconcile-juan-diaz-stripe-trimestral.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import Stripe from 'stripe'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

const SUBSCRIPTION_ID = 'sub_1UAwamK4wL9jsibNsmpgHo1d'
const PAYMENT_INTENT_ID = 'pi_3UAwaeK4wL9jsibN1lrbOT6X'
const CUSTOMER_ID = 'cus_VBJDw8YAK8UPJ5'

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'diazjuand@gmail.com' } })
  if (!user) throw new Error('User not found')
  console.log('User:', user.id, user.name, user.email)

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: 'rgm-trimestral' },
  })
  if (!plan) throw new Error('Plan rgm-trimestral not found')
  console.log('Plan:', plan.id, plan.name, plan.price, plan.currency, 'schoolId=', plan.schoolId)

  const school = await prisma.school.findUnique({
    where: { id: plan.schoolId },
    select: { id: true, name: true, stripeSecretKey: true },
  })
  if (!school?.stripeSecretKey) throw new Error('School has no Stripe secret key on file')

  // Idempotency check — never create a second record for the same payment.
  const existingTxn = await prisma.transaction.findFirst({ where: { stripePaymentIntentId: PAYMENT_INTENT_ID } })
  if (existingTxn) {
    console.log('\nA Transaction for this payment_intent already exists — nothing to do.', existingTxn.id)
    return
  }
  const existingMembership = await prisma.membership.findFirst({ where: { stripeSubId: SUBSCRIPTION_ID } })
  if (existingMembership) {
    console.log('\nA Membership for this subscription already exists — nothing to do.', existingMembership.id)
    return
  }

  const stripe = new Stripe(school.stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
  const subscription = await stripe.subscriptions.retrieve(SUBSCRIPTION_ID)
  const paymentIntent = await stripe.paymentIntents.retrieve(PAYMENT_INTENT_ID)

  if (subscription.customer !== CUSTOMER_ID) throw new Error('Subscription customer mismatch — aborting')
  if (paymentIntent.status !== 'succeeded') throw new Error(`PaymentIntent status is ${paymentIntent.status}, not succeeded — aborting`)

  const item = subscription.items.data[0]
  const periodStart = new Date(item.current_period_start * 1000)
  const periodEnd = new Date(item.current_period_end * 1000)
  const amount = paymentIntent.amount_received / 100
  const currency = paymentIntent.currency.toUpperCase()

  console.log('\nStripe subscription:', subscription.id, 'status=', subscription.status)
  console.log('  period:', periodStart.toISOString().slice(0, 10), '->', periodEnd.toISOString().slice(0, 10))
  console.log('  amount:', amount, currency)

  const currentMemberships = await prisma.membership.findMany({ where: { userId: user.id, schoolId: school.id } })
  console.log('\nExisting memberships at this school:')
  for (const m of currentMemberships) {
    console.log(`  ${m.id} | ${m.planName} | status=${m.status}`)
  }

  console.log('\nPlanned change:')
  console.log(`  Create Membership: ${plan.name}, ACTIVE, ${periodStart.toISOString().slice(0,10)} -> ${periodEnd.toISOString().slice(0,10)}, stripeSubId=${subscription.id}, stripeCustomerId=${CUSTOMER_ID}`)
  console.log(`  Set SchoolMember ACTIVE`)
  console.log(`  Record Transaction: ${amount} ${currency}, STRIPE, MEMBERSHIP, paymentIntent=${PAYMENT_INTENT_ID}`)

  if (!LIVE) {
    console.log('\nDry run only. Re-run with --live to apply.')
    return
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.membership.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        planId: plan.id,
        planName: plan.name,
        price: amount,
        currency,
        paymentMethod: 'STRIPE',
        status: 'ACTIVE',
        startDate: periodStart,
        endDate: periodEnd,
        stripeSubId: subscription.id,
        stripeCustomerId: CUSTOMER_ID,
      },
    })

    // Check-then-write rather than create-then-catch-P2002: a real unique
    // violation aborts the whole Postgres transaction at the DB level even
    // when the JS exception is caught, so a blind create() here would poison
    // the membership/transaction writes that follow it in this same tx.
    const existingSchoolMember = await tx.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
    })
    if (existingSchoolMember) {
      await tx.schoolMember.update({
        where: { id: existingSchoolMember.id },
        data: { status: 'ACTIVE' },
      })
    } else {
      await tx.schoolMember.create({
        data: { userId: user.id, schoolId: school.id, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() },
      })
    }

    await tx.transaction.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        membershipId: created.id,
        type: 'INCOME',
        status: 'PAID',
        category: 'MEMBERSHIP',
        paymentMethod: 'STRIPE',
        amount,
        currency,
        description: plan.name,
        date: new Date(paymentIntent.created * 1000),
        stripePaymentIntentId: PAYMENT_INTENT_ID,
      },
    })

    console.log('\nCreated membership:', created.id)
  })

  console.log('\nApplied.')
}

main().finally(() => prisma.$disconnect())
