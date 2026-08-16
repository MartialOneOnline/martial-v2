/**
 * Reconciles historical Lead <-> SchoolMember conversions that predate the
 * automatic conversion hook (convertLeadOnMembershipActivation() in
 * apps/web/lib/leads.ts, added 2026-08-16). That hook only fires going
 * forward, on new membership activations — every Lead that was already
 * sitting open (or LOST) before it landed needs this one-time backfill.
 *
 * For every Lead not already CONVERTED, matches by email (case-insensitive)
 * against User, then checks whether that User ever had a Membership at the
 * same school with a status only reachable after having been ACTIVE at
 * least once (ACTIVE, PAUSED, CANCELLED, EXPIRED — excludes PENDING, which
 * means a checkout/assignment was started but never actually activated).
 * If found, marks the Lead CONVERTED with convertedUserId and convertedAt
 * set to that membership's earliest startDate.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/reconcile-lead-conversions.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/reconcile-lead-conversions.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

// Only reachable after the membership was ACTIVE at some point — a lone
// PENDING membership (abandoned checkout, never-activated cash plan) must
// not count as a conversion.
const EVER_ACTIVATED_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE — will write' : 'DRY RUN (pass --live to write)'}`)

  const leads = await prisma.lead.findMany({
    where: { status: { not: 'CONVERTED' }, email: { not: null } },
    select: { id: true, schoolId: true, email: true, name: true, status: true },
  })
  console.log(`Open leads with an email: ${leads.length}`)

  let matched = 0
  let skippedNoEmail = 0
  let skippedNoUser = 0
  let skippedNoMembership = 0

  for (const lead of leads) {
    const email = lead.email?.trim()
    if (!email) { skippedNoEmail++; continue }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!user) { skippedNoUser++; continue }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, schoolId: lead.schoolId, status: { in: EVER_ACTIVATED_STATUSES } },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    })
    if (!membership) { skippedNoMembership++; continue }

    matched++
    console.log(
      `${LIVE ? 'CONVERTING' : 'WOULD CONVERT'}: lead=${lead.id} (${lead.name} <${email}>) ` +
      `status=${lead.status} -> userId=${user.id}, convertedAt=${membership.startDate.toISOString()}`,
    )

    if (LIVE) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED', convertedUserId: user.id, convertedAt: membership.startDate },
      })
    }
  }

  console.log(
    `\nDone. ${LIVE ? 'Converted' : 'Would convert'}: ${matched}. ` +
    `No email: ${skippedNoEmail}. No matching user: ${skippedNoUser}. ` +
    `User exists but never activated a membership at this school: ${skippedNoMembership}.`,
  )
}

main().finally(() => prisma.$disconnect())
