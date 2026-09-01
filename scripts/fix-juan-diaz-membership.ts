/**
 * One-off manual correction: Juan Diaz (diazjuand@gmail.com, Roger Gracie
 * Malaga) had a 180 EUR cash renewal payment recorded by mistake and then
 * deleted from the Transactions page — but the DELETE endpoint at the time
 * didn't revert the Membership.endDate/status bump that marking the renewal
 * "paid" had applied (see the fix in apps/web/app/api/dashboard/transactions/[id]/route.ts
 * and apps/web/lib/services/membership.ts::revertMembershipForDeletedTransaction).
 * This finds the deleted transaction and reverts the membership by hand.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/fix-juan-diaz-membership.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/fix-juan-diaz-membership.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'diazjuand@gmail.com' } })
  if (!user) throw new Error('User not found')
  console.log('User:', user.id, user.name, user.email)

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\nMemberships:')
  for (const m of memberships) {
    console.log(`  ${m.id} | ${m.planName} | status=${m.status} | start=${m.startDate.toISOString().slice(0,10)} | end=${m.endDate?.toISOString().slice(0,10)} | cancelledAt=${m.cancelledAt?.toISOString().slice(0,10) ?? null}`)
  }

  const txns = await prisma.transaction.findMany({
    where: { userId: user.id, category: 'MEMBERSHIP' },
    orderBy: { date: 'asc' },
  })
  console.log('\nMembership transactions (incl. deleted):')
  for (const t of txns) {
    console.log(`  ${t.id} | ${Number(t.amount)} ${t.currency} | status=${t.status} | date=${t.date.toISOString().slice(0,10)} | periodStart=${t.periodStart?.toISOString().slice(0,10) ?? null} | periodEnd=${t.periodEnd?.toISOString().slice(0,10) ?? null} | membershipId=${t.membershipId} | deletedAt=${t.deletedAt?.toISOString() ?? null}`)
  }

  const mistaken = txns.find(t => t.deletedAt && Number(t.amount) === 180 && t.paymentMethod === 'CASH')
  if (!mistaken) {
    console.log('\nNo deleted 180 CASH transaction found — nothing to do. Check the lists above manually.')
    return
  }
  console.log('\nMistaken (deleted) transaction:', mistaken.id)

  if (!mistaken.membershipId) {
    console.log('Transaction has no membershipId — nothing to revert.')
    return
  }

  const membership = await prisma.membership.findUnique({ where: { id: mistaken.membershipId } })
  if (!membership) throw new Error('Linked membership not found')
  console.log('\nLinked membership:', membership.id, membership.planName, 'status=', membership.status, 'endDate=', membership.endDate?.toISOString().slice(0,10))

  // This was the founding payment of a "Change plan" action (no periodStart/
  // periodEnd — that's only set by the renewal flow). Per explicit admin
  // decision: cancel just this mistaken membership now, immediately, and
  // do NOT touch whatever membership it superseded (Jiu Jitsu Mensual stays
  // cancelled — reactivating it is a separate, deliberate action if wanted).
  if (membership.status === 'CANCELLED') {
    console.log('\nMembership is already CANCELLED — nothing to do.')
    return
  }

  console.log('\nPlanned change:')
  console.log(`  ${membership.planName} (${membership.id}): status ${membership.status} -> CANCELLED (immediate, cancelledAt=now)`)
  console.log('  Jiu Jitsu Mensual: left untouched (still CANCELLED, not reactivated, per instruction)')

  if (!LIVE) {
    console.log('\nDry run only. Re-run with --live to apply.')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membership.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })
    await tx.transaction.updateMany({
      where: { membershipId: membership.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
    // No other active membership remains for Juan Diaz after this — mirror
    // the same sync cancelMembership() does when nothing else covers the user.
    await tx.schoolMember.updateMany({
      where: { userId: user.id, schoolId: membership.schoolId, status: { not: 'ARCHIVED' } },
      data: { status: 'INACTIVE' },
    })
  })
  console.log('\nApplied.')
}

main().finally(() => prisma.$disconnect())
