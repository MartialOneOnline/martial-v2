#!/usr/bin/env tsx
/**
 * cancel-one-off-renewals.ts — Cleans up PENDING "— renewal" payments the
 * daily cash-renewal cron created for single passes (bonos) and trials before
 * generateDueRenewalPayments learned they never renew. Marking one of those
 * paid would have extended the used-up pass instead of assigning a new plan.
 *
 * Only touches PENDING MEMBERSHIP transactions with a periodEnd (that field
 * is only set by createRenewalPayment) whose membership's plan is
 * SINGLE_PASS or TRIAL. Sets them to CANCELLED — nothing is deleted.
 *
 * Dry run by default (prints what it would cancel). Pass --apply to write.
 *
 * Usage:
 *   npx tsx apps/web/scripts/cancel-one-off-renewals.ts
 *   npx tsx apps/web/scripts/cancel-one-off-renewals.ts --apply
 */
import { prisma } from '../lib/db'

async function main() {
  const apply = process.argv.includes('--apply')
  const rows = await prisma.transaction.findMany({
    where: {
      status: 'PENDING', category: 'MEMBERSHIP', periodEnd: { not: null },
      membership: { plan: { planType: { in: ['SINGLE_PASS', 'TRIAL'] } } },
    },
    select: {
      id: true, amount: true, currency: true, description: true, date: true,
      school: { select: { name: true } },
      user: { select: { name: true, email: true } },
      membership: { select: { plan: { select: { planType: true } } } },
    },
    orderBy: { date: 'asc' },
  })

  console.log(`\nPending renewals on single passes / trials: ${rows.length}${apply ? '' : ' (dry run)'}\n`)
  for (const t of rows) {
    console.log(`  [${t.school?.name ?? '—'}] ${t.user?.name ?? '—'} <${t.user?.email ?? '—'}> — ${t.description} — ${Number(t.amount)} ${t.currency} — ${t.membership?.plan?.planType} — created ${t.date.toISOString().slice(0, 10)} — ${t.id}`)
  }

  if (!apply || rows.length === 0) return
  const { count } = await prisma.transaction.updateMany({
    where: { id: { in: rows.map(r => r.id) }, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
  console.log(`\nCancelled ${count}.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
