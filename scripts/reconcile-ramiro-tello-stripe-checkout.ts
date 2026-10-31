/**
 * One-off manual reconciliation: Ramiro (ramirotello11@gmail.com, Roger
 * Gracie Malaga) paid a real 65 EUR Stripe subscription for "Jiu Jitsu
 * Mensual" on 2026-09-17 through the app's own checkout (session carried the
 * correct metadata.schoolId/userId/planId), but the webhook's
 * checkout.session.completed handler threw mid-transaction (see
 * fix/webhook-schoolmember-transaction-abort: create-then-catch-P2002 on
 * schoolMember poisoned the Postgres transaction because Ramiro already had
 * a SchoolMember row from an earlier "Prueba 1 Dia" trial), silently rolling
 * back the Membership + Transaction that had already been written earlier in
 * the same transaction. StripeWebhookEvent evt_1UGiI2K4wL9jsibNylhnWHEE
 * recorded the failure; Stripe never got a successful response and gave up
 * retrying. This performs, by hand, exactly what checkout.session.completed
 * would have done, sourcing the real period dates from Stripe.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reconcile-ramiro-tello-stripe-checkout.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/reconcile-ramiro-tello-stripe-checkout.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import Stripe from 'stripe'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const LIVE = process.argv.includes('--live')

const USER_ID = 'cmty4j7u3000004l2m0rpqblm'
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const PLAN_ID = 'rgm-mensual'
const SUBSCRIPTION_ID = 'sub_1UGiI1K4wL9jsibNTPRaulER'
const CUSTOMER_ID = 'cus_VHGp3Vu7Kyw7br'

async function main() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } })
  if (!user) throw new Error('User not found')
  console.log('User:', user.id, user.name, user.email)

  const plan = await prisma.membershipPlan.findUnique({ where: { id: PLAN_ID } })
  if (!plan) throw new Error('Plan not found')
  console.log('Plan:', plan.id, plan.name, plan.price, plan.currency)

  const school = await prisma.school.findUnique({ where: { id: SCHOOL_ID }, select: { id: true, stripeSecretKey: true } })
  if (!school?.stripeSecretKey) throw new Error('School has no Stripe secret key')

  const existingMembership = await prisma.membership.findFirst({ where: { stripeSubId: SUBSCRIPTION_ID } })
  if (existingMembership) {
    console.log('\nA Membership for this subscription already exists — nothing to do.', existingMembership.id)
    return
  }

  const stripe = new Stripe(school.stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
  const subscription = await stripe.subscriptions.retrieve(SUBSCRIPTION_ID)
  if (subscription.customer !== CUSTOMER_ID) throw new Error('Subscription customer mismatch — aborting')
  if (subscription.status !== 'active') throw new Error(`Subscription status is ${subscription.status}, not active — aborting`)

  const item = subscription.items.data[0]!
  const periodStart = new Date(item.current_period_start * 1000)
  const periodEnd = new Date(item.current_period_end * 1000)
  const amount = plan.price
  const currency = plan.currency

  console.log('\nStripe subscription:', subscription.id, 'status=', subscription.status)
  console.log('  period:', periodStart.toISOString().slice(0, 10), '->', periodEnd.toISOString().slice(0, 10))

  const existingSchoolMember = await prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId: SCHOOL_ID, userId: USER_ID } },
  })
  console.log('\nExisting SchoolMember:', existingSchoolMember?.status ?? 'none')

  console.log('\nPlanned change:')
  console.log(`  Create Membership: ${plan.name}, ACTIVE, ${periodStart.toISOString().slice(0,10)} -> ${periodEnd.toISOString().slice(0,10)}, stripeSubId=${subscription.id}, stripeCustomerId=${CUSTOMER_ID}`)
  console.log(`  Set SchoolMember ACTIVE`)
  console.log(`  Record Transaction: ${amount} ${currency}, STRIPE, MEMBERSHIP`)

  if (!LIVE) {
    console.log('\nDry run only. Re-run with --live to apply.')
    return
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.membership.create({
      data: {
        userId: USER_ID, schoolId: SCHOOL_ID, planId: PLAN_ID,
        planName: plan.name, price: amount, currency,
        paymentMethod: 'STRIPE', status: 'ACTIVE',
        startDate: periodStart, endDate: periodEnd,
        stripeSubId: subscription.id, stripeCustomerId: CUSTOMER_ID,
      },
    })

    if (existingSchoolMember) {
      await tx.schoolMember.update({ where: { id: existingSchoolMember.id }, data: { status: 'ACTIVE' } })
    } else {
      await tx.schoolMember.create({
        data: { userId: USER_ID, schoolId: SCHOOL_ID, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() },
      })
    }

    await tx.transaction.create({
      data: {
        schoolId: SCHOOL_ID, userId: USER_ID, membershipId: created.id,
        type: 'INCOME', status: 'PAID', category: 'MEMBERSHIP', paymentMethod: 'STRIPE',
        amount, currency, description: plan.name, date: periodStart,
      },
    })

    console.log('\nCreated membership:', created.id)
  })

  console.log('\nApplied.')
}

main().finally(() => prisma.$disconnect())
