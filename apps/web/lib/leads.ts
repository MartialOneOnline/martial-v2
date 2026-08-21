import { prisma } from '@/lib/db'
import { LeadStatus, LeadSource } from '@/lib/prisma-client/enums'

// Ranks a Lead's progress through the pipeline so upsertProspectLead only
// ever moves a lead forward. LOST ranks below NEW so any real engagement
// signal "revives" it automatically (mirrors convertLeadOnMembershipActivation's
// own re-linking of a previously LOST lead) — CONVERTED is the only terminal
// state that nothing here is allowed to touch.
const STATUS_RANK: Record<LeadStatus, number> = {
  [LeadStatus.LOST]:         -1,
  [LeadStatus.NEW]:          0,
  [LeadStatus.INVITED]:      1,
  [LeadStatus.CONTACTED]:    2,
  [LeadStatus.TRIAL_BOOKED]: 3,
  [LeadStatus.CONVERTED]:    4,
}

/**
 * Marks any open CRM Lead matching this user's email as CONVERTED whenever a
 * Membership for them becomes ACTIVE — "became a paying student" is the
 * actual conversion event, not just being added as a SchoolMember. Matches
 * case-insensitively and re-links even a previously LOST lead (they came
 * back), but leaves an already-CONVERTED lead alone so repeat activations
 * (renewals, a second plan) don't keep bumping convertedAt.
 *
 * Fire-and-forget from every call site — a missing Lead is the common case
 * (most members never went through the CRM) and must never fail the
 * membership activation itself.
 */
export async function convertLeadOnMembershipActivation(schoolId: string, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (!user?.email) return

  await prisma.lead.updateMany({
    where: {
      schoolId,
      email: { equals: user.email, mode: 'insensitive' },
      status: { not: LeadStatus.CONVERTED },
    },
    data: {
      status: LeadStatus.CONVERTED,
      convertedUserId: userId,
      convertedAt: new Date(),
    },
  })
}

/**
 * Records — or advances — a CRM Lead whenever someone engages with a school
 * through a non-CRM entry point (staff invite, "Join this school" self-request,
 * free trial booking). Creates a new Lead if none exists for this school+email;
 * otherwise only moves an existing Lead forward per STATUS_RANK, and never
 * touches an already-CONVERTED lead or overwrites its original `source`.
 *
 * Fire-and-forget from every call site — never let a CRM-side failure break
 * the invite/join/trial flow that triggered it.
 */
export async function upsertProspectLead(
  schoolId: string,
  email: string,
  name: string | null | undefined,
  { source, status }: { source: LeadSource; status: LeadStatus },
): Promise<void> {
  try {
    const existing = await prisma.lead.findFirst({
      where: { schoolId, email: { equals: email, mode: 'insensitive' } },
      select: { id: true, status: true },
    })

    if (!existing) {
      await prisma.lead.create({
        data: { schoolId, email, name: name?.trim() || email, source, status },
      })
      return
    }

    if (existing.status === LeadStatus.CONVERTED) return
    if (STATUS_RANK[status] > STATUS_RANK[existing.status]) {
      await prisma.lead.update({ where: { id: existing.id }, data: { status } })
    }
  } catch (err) {
    console.error('[upsertProspectLead] failed:', err)
  }
}
