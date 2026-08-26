/**
 * One-off, READ-ONLY audit: cross-references every Roger Gracie Málaga
 * Membership that has a stripeSubId against the *live* Stripe subscription
 * it points to, to find cases where Membership.endDate/status drifted from
 * reality — the same bug class found for Dmitry Prokofyev (a stale
 * customer.subscription.updated event regressing endDate after a later
 * invoice.payment_succeeded had already advanced it).
 *
 * Never writes anything.
 *
 * Usage:
 *   npx tsx scripts/audit-rga-stripe-drift.ts
 */
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

async function main() {
  const { prisma } = await import('../apps/web/lib/db')
  const { getStripe } = await import('../apps/web/lib/stripe')

  const school = await prisma.school.findUnique({
    where: { id: SCHOOL_ID },
    select: { id: true, name: true, stripeSecretKey: true },
  })
  if (!school?.stripeSecretKey) throw new Error(`School ${SCHOOL_ID} has no stripeSecretKey configured`)
  console.log(`School: ${school.name} (${school.id})\n`)

  const stripe = getStripe(school.stripeSecretKey)

  const memberships = await prisma.membership.findMany({
    where: { schoolId: SCHOOL_ID, stripeSubId: { not: null } },
    select: {
      id: true, userId: true, planName: true, status: true,
      startDate: true, endDate: true, stripeSubId: true, stripeInvoiceId: true,
      cancelledAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { startDate: 'asc' },
  })
  console.log(`Memberships with a stripeSubId: ${memberships.length}\n`)

  const statusMap: Record<string, string> = {
    active: 'ACTIVE', trialing: 'ACTIVE', past_due: 'ACTIVE',
    paused: 'PAUSED', canceled: 'CANCELLED', unpaid: 'ACTIVE', incomplete: 'ACTIVE',
  }

  let mismatches = 0
  for (const m of memberships) {
    let sub
    try {
      sub = await stripe.subscriptions.retrieve(m.stripeSubId!, { expand: ['latest_invoice'] })
    } catch (err) {
      console.log(`⚠️  ${m.user.email} — could not fetch sub ${m.stripeSubId}: ${(err as Error).message}`)
      continue
    }

    const periodEndUnix = sub.current_period_end ?? (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end
    const stripeEndDate = periodEndUnix ? new Date(periodEndUnix * 1000) : null
    const expectedStatus = statusMap[sub.status] ?? m.status
    const isPaused = !!sub.pause_collection

    const dbEnd = m.endDate ? m.endDate.toISOString().slice(0, 10) : 'null'
    const stripeEnd = stripeEndDate ? stripeEndDate.toISOString().slice(0, 10) : 'null'

    const endDateDrift = stripeEndDate && m.endDate && Math.abs(stripeEndDate.getTime() - m.endDate.getTime()) > 24 * 3600 * 1000
    const statusDrift = expectedStatus !== m.status && !(isPaused && m.status === 'PAUSED')

    const nowPastDue = m.endDate ? m.endDate.getTime() < Date.now() : false
    const stripeHealthy = sub.status === 'active' || sub.status === 'trialing'
    const falseRenewalDue = nowPastDue && stripeHealthy && endDateDrift

    if (endDateDrift || statusDrift) {
      mismatches++
      console.log(`❌ ${m.user.name ?? m.user.email} <${m.user.email}>`)
      console.log(`   membershipId=${m.id} sub=${m.stripeSubId} stripe.status=${sub.status}${isPaused ? ' (collection paused)' : ''}`)
      console.log(`   DB:     status=${m.status.padEnd(10)} endDate=${dbEnd}`)
      console.log(`   Stripe: status=${expectedStatus.padEnd(10)} endDate=${stripeEnd}${falseRenewalDue ? '  <-- DASHBOARD WOULD SHOW FALSE "Renewal due"' : ''}`)
      console.log('')
    } else {
      console.log(`✓  ${m.user.email} — in sync (endDate ${dbEnd}, status ${m.status})`)
    }
  }

  console.log(`\n${mismatches} mismatch(es) out of ${memberships.length} memberships checked.`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
