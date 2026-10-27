/**
 * One-off manual reconciliation: Juanma Dominguez (juanmab1@hotmail.es, Roger
 * Gracie Malaga) paid a real 180 EUR Stripe subscription for "Jiu Jitsu
 * Trimestral" on 2026-10-23 through the app's own checkout (correct
 * metadata), but checkout.session.completed (evt_1UTfwdK4wL9jsibNTRlhijgj)
 * failed with "current transaction is aborted": he already had a LEAD
 * SchoolMember row (invited, with a free "Access" pass), and the unfixed
 * create-then-catch-P2002 in the webhook poisoned the Postgres transaction,
 * rolling back the Membership + Transaction. Same bug as Ramiro's (see
 * reconcile-ramiro-tello-stripe-checkout.ts), fixed by PR #21 but merged only
 * after this payment. This performs, by hand, what the webhook would have
 * done, sourcing the real period dates from Stripe. If Stripe's own retry of
 * the event heals it first, the existing-membership guard makes this a no-op.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reconcile-juanma-dominguez-stripe-checkout.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/reconcile-juanma-dominguez-stripe-checkout.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import Stripe from 'stripe'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const LIVE = process.argv.includes('--live')

const USER_ID = 'cmvcq0l3o000004l3favxrbj6'
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const PLAN_ID = 'rgm-trimestral'
const SUBSCRIPTION_ID = 'sub_1UTfwaK4wL9jsibNETDF7To8'
const CUSTOMER_ID = 'cus_VUfDm2uJs7TtQD'

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

  // Same as the webhook's post-activation step: a CRM lead for this email becomes CONVERTED.
  await prisma.lead.updateMany({
    where: { schoolId: SCHOOL_ID, email: { equals: user.email, mode: 'insensitive' }, status: { not: 'CONVERTED' } },
    data: { status: 'CONVERTED', convertedUserId: USER_ID, convertedAt: new Date() },
  })

  console.log('\nApplied.')
}

main().finally(() => prisma.$disconnect())
