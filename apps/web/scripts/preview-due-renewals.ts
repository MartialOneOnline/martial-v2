#!/usr/bin/env tsx
/**
 * preview-due-renewals.ts — Read-only preview of what
 * generateDueRenewalPayments (apps/web/lib/services/membership.ts) would
 * create on its next cron run: every ACTIVE cash membership whose endDate
 * has already passed and isn't already set to cancel at period end.
 *
 * Never writes anything.
 *
 * Usage:
 *   npx tsx apps/web/scripts/preview-due-renewals.ts
 */
import { prisma } from '../lib/db'

async function main() {
  const due = await prisma.membership.findMany({
    where: { status: 'ACTIVE', paymentMethod: 'CASH', endDate: { lte: new Date() }, cancelledAt: null },
    select: {
      id: true, planName: true, price: true, currency: true, endDate: true,
      school: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  })

  console.log(`\nCash memberships past endDate, eligible for a pending renewal payment: ${due.length}\n`)

  let wouldCreate = 0
  for (const m of due) {
    const existing = await prisma.transaction.findFirst({
      where: { membershipId: m.id, status: 'PENDING', category: 'MEMBERSHIP' },
    })
    const label = `[${m.school?.name ?? '—'}] ${m.user?.name ?? m.user?.email ?? '—'} — ${m.planName} (${Number(m.price)} ${m.currency}, endDate ${m.endDate?.toISOString().slice(0, 10)})`
    if (existing) {
      console.log(`  SKIP (already has a pending renewal) — ${label}`)
    } else {
      console.log(`  CREATE — ${label}`)
      wouldCreate++
    }
  }

  console.log(`\nWould create ${wouldCreate} new pending renewal transaction(s) on the next real cron run.\n`)
}

main().finally(() => prisma.$disconnect())
