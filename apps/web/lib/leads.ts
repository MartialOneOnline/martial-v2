import { prisma } from '@/lib/db'
import { LeadStatus } from '@/lib/prisma-client/enums'

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
