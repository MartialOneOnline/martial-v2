/**
 * Backfills a CRM Lead for every existing SchoolMember still sitting in
 * PENDING (invite sent, not accepted) or LEAD (accepted invite / self-request
 * join, no membership yet) — these predate the upsertProspectLead() hooks
 * added to members/invite, activate-member, and schools/[slug]/join (see
 * apps/web/lib/leads.ts). Those hooks only fire going forward; this is a
 * one-time catch-up for whatever's already open.
 *
 * PENDING -> Lead{status: INVITED, source: INVITE}
 * LEAD (via self-request, detected from the SchoolMember.notes tag) ->
 *   Lead{status: CONTACTED, source: SELF_REQUEST}
 * LEAD (anything else, i.e. an accepted staff invite) ->
 *   Lead{status: CONTACTED, source: INVITE}
 *
 * Skipped if a Lead already exists for that school+email (any status) —
 * never creates a duplicate. createdAt is backdated to the SchoolMember's
 * own createdAt so backfilled rows sort correctly among historical leads
 * instead of all appearing as "just now".
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-invite-leads.ts          # dry-run (default)
 *   npx tsx --env-file=.env scripts/backfill-invite-leads.ts --live   # actually write
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const LIVE = process.argv.includes('--live')

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE — will write' : 'DRY RUN (pass --live to write)'}`)

  const members = await prisma.schoolMember.findMany({
    where: { status: { in: ['PENDING', 'LEAD'] } },
    select: {
      id: true, schoolId: true, status: true, createdAt: true, notes: true,
      user: { select: { email: true, name: true } },
    },
  })
  console.log(`PENDING/LEAD school members found: ${members.length}`)

  let created = 0
  let skippedAlreadyHasLead = 0
  let skippedNoEmail = 0

  for (const member of members) {
    const email = member.user.email?.trim()
    if (!email) { skippedNoEmail++; continue }

    const existingLead = await prisma.lead.findFirst({
      where: { schoolId: member.schoolId, email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existingLead) { skippedAlreadyHasLead++; continue }

    const isSelfRequest = member.notes?.includes('SELF_REQUEST') ?? false
    const status = member.status === 'PENDING' ? 'INVITED' : 'CONTACTED'
    const source = member.status === 'PENDING' ? 'INVITE' : (isSelfRequest ? 'SELF_REQUEST' : 'INVITE')

    created++
    console.log(
      `${LIVE ? 'CREATED' : 'WOULD CREATE'}: schoolId=${member.schoolId} email=${email} ` +
      `(${member.user.name ?? email}) memberStatus=${member.status} -> Lead{status=${status}, source=${source}, ` +
      `createdAt=${member.createdAt.toISOString()}}`,
    )

    if (LIVE) {
      await prisma.lead.create({
        data: {
          schoolId: member.schoolId,
          name: member.user.name?.trim() || email,
          email,
          source,
          status,
          createdAt: member.createdAt,
        },
      })
    }
  }

  console.log(
    `\nDone. ${LIVE ? 'Created' : 'Would create'}: ${created}. ` +
    `Already had a lead: ${skippedAlreadyHasLead}. No email: ${skippedNoEmail}.`,
  )
}

main().finally(() => prisma.$disconnect())
