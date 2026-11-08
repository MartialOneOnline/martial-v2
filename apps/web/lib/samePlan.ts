import type { Prisma } from '@/lib/prisma-client/client'
import type { MembershipStatus } from '@/lib/prisma-client/enums'

type PlanRef = { planId: string | null; planName: string }

/**
 * Whether two memberships are for the same plan. Memberships imported from
 * V1 carry no planId, only the plan's name, so when either side has no
 * planId the names are compared instead (case- and space-insensitive).
 */
export function isSamePlan(a: PlanRef, b: PlanRef): boolean {
  if (a.planId && b.planId) return a.planId === b.planId
  return a.planName.trim().toLowerCase() === b.planName.trim().toLowerCase()
}

/**
 * Finds another membership the student already has for the same plan at the
 * same school — used to stop a second copy of a plan being activated, which
 * would run two parallel renewal streams for one student.
 */
export async function findSamePlanMembership(
  db: Pick<Prisma.TransactionClient, 'membership'>,
  target: PlanRef & { userId: string; schoolId: string; excludeId?: string },
  statuses: MembershipStatus[],
) {
  const candidates = await db.membership.findMany({
    where: {
      userId: target.userId,
      schoolId: target.schoolId,
      status: { in: statuses },
      ...(target.excludeId ? { id: { not: target.excludeId } } : {}),
    },
    select: { id: true, planId: true, planName: true, status: true, paymentMethod: true },
  })
  return candidates.find(c => isSamePlan(c, target)) ?? null
}
