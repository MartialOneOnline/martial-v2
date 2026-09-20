/**
 * One-off backfill for Membership.paymentStatus (run AFTER the
 * 20260919081500_add_membership_payment_status migration is applied and the
 * new webhook is deployed).
 *
 * Every existing row defaults to paymentStatus=ACTIVE, which is wrong for any
 * Stripe subscription that is currently past_due/unpaid/canceled, and the old
 * invoice.payment_failed handler froze such members (Membership PAUSED ->
 * SchoolMember FROZEN) even while Stripe was still retrying. For each
 * Stripe-billed membership still ACTIVE or PAUSED this reads the live
 * subscription status from Stripe and:
 *   - mirrors it into paymentStatus (paymentStatusAt = now);
 *   - if Membership is PAUSED but Stripe says past_due, restores it to ACTIVE
 *     (that freeze came from the old handler; Stripe's retry window is the
 *     grace period) and un-freezes the SchoolMember if it is FROZEN;
 *   - leaves PAUSED + unpaid/paused alone (access correctly cut).
 * PAUSED + past_due is ambiguous with a deliberate pause; every such row is
 * listed explicitly in the plan so it can be reviewed before --live.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-membership-payment-status.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/backfill-membership-payment-status.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import Stripe from 'stripe'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const LIVE = process.argv.includes('--live')

type PaymentStatus = 'TRIALING' | 'ACTIVE' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAST_DUE' | 'UNPAID' | 'PAUSED' | 'CANCELED'

const STATUS_MAP: Record<string, PaymentStatus> = {
  trialing: 'TRIALING', active: 'ACTIVE', incomplete: 'INCOMPLETE', incomplete_expired: 'INCOMPLETE_EXPIRED',
  past_due: 'PAST_DUE', unpaid: 'UNPAID', paused: 'PAUSED', canceled: 'CANCELED',
}

async function main() {
  const memberships = await prisma.membership.findMany({
    where: { stripeSubId: { not: null }, status: { in: ['ACTIVE', 'PAUSED'] } },
    select: {
      id: true, userId: true, schoolId: true, planName: true, status: true, stripeSubId: true, paymentStatus: true,
      user: { select: { email: true } },
      school: { select: { name: true, stripeSecretKey: true } },
    },
  })
  console.log(`${LIVE ? 'LIVE' : 'DRY-RUN'} — ${memberships.length} Stripe-billed ACTIVE/PAUSED memberships\n`)

  const clients = new Map<string, Stripe | null>()
  const clientFor = (m: typeof memberships[number]) => {
    if (!clients.has(m.schoolId)) {
      const key = m.school.stripeSecretKey
      clients.set(m.schoolId, key && /^(sk|rk)_/.test(key) ? new Stripe(key, { apiVersion: '2026-06-24.dahlia' }) : null)
    }
    return clients.get(m.schoolId)!
  }

  let changed = 0, restored = 0, skipped = 0
  for (const m of memberships) {
    const stripe = clientFor(m)
    if (!stripe) { console.log(`SKIP  ${m.id} ${m.user.email} — ${m.school.name} has no usable Stripe key`); skipped++; continue }

    let stripeStatus: string
    try {
      stripeStatus = (await stripe.subscriptions.retrieve(m.stripeSubId!)).status
    } catch (err) {
      console.log(`SKIP  ${m.id} ${m.user.email} — cannot read ${m.stripeSubId}: ${(err as Error).message}`)
      skipped++
      continue
    }

    const target = STATUS_MAP[stripeStatus]
    if (!target) { console.log(`SKIP  ${m.id} ${m.user.email} — unmapped Stripe status "${stripeStatus}"`); skipped++; continue }

    const restoreAccess = m.status === 'PAUSED' && stripeStatus === 'past_due'
    if (target === m.paymentStatus && !restoreAccess) continue

    changed++
    if (restoreAccess) restored++
    console.log(
      `${restoreAccess ? 'RESTORE' : 'SET    '} ${m.id} ${m.user.email} | ${m.planName} | membership ${m.status}` +
      `${restoreAccess ? ' -> ACTIVE (+SchoolMember FROZEN -> ACTIVE)' : ''} | paymentStatus ${m.paymentStatus} -> ${target} (stripe: ${stripeStatus})`,
    )

    if (!LIVE) continue
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: m.id },
        data: { paymentStatus: target, paymentStatusAt: new Date(), ...(restoreAccess && { status: 'ACTIVE' }) },
      })
      if (restoreAccess) {
        await tx.schoolMember.updateMany({
          where: { userId: m.userId, schoolId: m.schoolId, status: 'FROZEN' },
          data: { status: 'ACTIVE' },
        })
      }
    })
  }

  console.log(`\n${changed} to update (${restored} access restorations), ${skipped} skipped.`)
  if (!LIVE) console.log('Dry run only. Re-run with --live to apply.')
}

main().finally(() => prisma.$disconnect())
