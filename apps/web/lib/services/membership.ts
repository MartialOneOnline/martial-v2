/**
 * MembershipService — single source of truth for membership lifecycle.
 *
 * All assignment, cancellation, renewal, and access-check logic lives here.
 * Both the admin API route and the Stripe webhook call these functions,
 * guaranteeing identical behaviour regardless of how a membership was created.
 */

import { prisma } from '@/lib/db'
import { PaymentMethod, MembershipStatus, TransactionType, TransactionCategory, TransactionStatus } from '@/lib/prisma-client/enums'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AssignPlanInput {
  schoolMemberId: string   // SchoolMember.id (resolves to userId)
  schoolId:       string
  planId:         string
  startDate?:     Date
  paymentMethod?: PaymentMethod
  notes?:         string
  /** Set when the assignment originates from a Stripe checkout */
  stripeSubId?:   string
  /** If this is a renewal, pass the previous membership id */
  renewedFromId?: string
}

export interface CancelMembershipInput {
  membershipId: string
  schoolId:     string
  reason?:      string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Compute endDate from plan billing rules.
 * - SUBSCRIPTION: endDate = start + one billing cycle (acts as the next renewal date)
 * - SINGLE_PASS / TRIAL: endDate = start + validityDays
 * - No validityDays + SUBSCRIPTION → null (open-ended until next renewal)
 */
export function computeEndDate(
  planType: string,
  billingCycle: string,
  validityDays: number | null,
  start: Date,
): Date | null {
  if (planType === 'SUBSCRIPTION') {
    const end = new Date(start)
    switch (billingCycle) {
      case 'monthly':    end.setMonth(end.getMonth() + 1);    break
      case 'quarterly':  end.setMonth(end.getMonth() + 3);    break
      case 'annual':     end.setFullYear(end.getFullYear() + 1); break
      case 'two-weekly': end.setDate(end.getDate() + 14);     break
      case 'one-off':    return null  // lifetime / single payment subscription
      default:           end.setMonth(end.getMonth() + 1)
    }
    return end
  }
  if (validityDays) {
    const end = new Date(start)
    end.setDate(end.getDate() + validityDays)
    return end
  }
  return null
}

// ── Core operations ────────────────────────────────────────────────────────────

/**
 * Assign a MembershipPlan to a school member.
 *
 * What this does atomically:
 *  1. Resolves schoolMember → userId
 *  2. Fetches + validates the plan
 *  3. Cancels any currently ACTIVE membership for that user+school
 *  4. Creates the new Membership row
 *  5. Creates a Transaction record (income entry)
 *  6. Promotes SchoolMember.status from PENDING/LEAD → ACTIVE
 *
 * Returns the created membership with plan included.
 */
export async function assignPlan(input: AssignPlanInput) {
  const { schoolMemberId, schoolId, planId, paymentMethod, notes, stripeSubId, renewedFromId } = input
  const start = input.startDate ?? new Date()

  // 1. Resolve member
  const schoolMember = await prisma.schoolMember.findFirst({
    where: { id: schoolMemberId, schoolId },
    select: { id: true, userId: true, status: true },
  })
  if (!schoolMember) throw new Error('Member not found')

  // 2. Validate plan
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, schoolId, isActive: true },
  })
  if (!plan) throw new Error('Plan not found or inactive')

  const endDate = computeEndDate(plan.planType, plan.billingCycle, plan.validityDays, start)

  // 3–6. All in one transaction
  const [membership] = await prisma.$transaction(async (tx) => {
    // Cancel existing active memberships
    await tx.membership.updateMany({
      where: { userId: schoolMember.userId, schoolId, status: MembershipStatus.ACTIVE },
      data: { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
    })

    // Create new membership
    const m = await tx.membership.create({
      data: {
        userId: schoolMember.userId,
        schoolId,
        planId,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency,
        paymentMethod: (paymentMethod ?? PaymentMethod.CASH),
        status: MembershipStatus.ACTIVE,
        startDate: start,
        endDate,
        stripeSubId: stripeSubId ?? null,
        renewedFromId: renewedFromId ?? null,
        notes: notes?.trim() || null,
      },
      include: { plan: { select: { name: true, planType: true, billingCycle: true } } },
    })

    // Create income transaction (skip for free/trial $0 plans)
    if (plan.price > 0) {
      await tx.transaction.create({
        data: {
          schoolId,
          userId: schoolMember.userId,
          membershipId: m.id,
          type: TransactionType.INCOME,
          status: TransactionStatus.PAID,
          category: TransactionCategory.MEMBERSHIP,
          amount: plan.price,
          currency: plan.currency,
          description: `${plan.name} — ${plan.planType === 'SUBSCRIPTION' ? plan.billingCycle : `${plan.validityDays ?? 0}d`}`,
          date: start,
          notes: notes?.trim() || null,
        },
      })
    }

    // Promote member status if they were a lead/pending
    if (['PENDING', 'LEAD'].includes(schoolMember.status)) {
      await tx.schoolMember.update({
        where: { id: schoolMemberId },
        data: { status: 'ACTIVE' },
      })
    }

    return [m]
  })

  return membership
}

/**
 * Cancel an active membership (soft cancel — keeps the record).
 */
export async function cancelMembership(input: CancelMembershipInput) {
  const { membershipId, schoolId, reason } = input

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId },
  })
  if (!membership) throw new Error('Membership not found')
  if (membership.status === MembershipStatus.CANCELLED) throw new Error('Already cancelled')

  return prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: MembershipStatus.CANCELLED,
      cancelledAt: new Date(),
      notes: reason
        ? [membership.notes, `Cancelled: ${reason}`].filter(Boolean).join(' | ')
        : membership.notes,
    },
  })
}

/**
 * Renew a membership — creates a new Membership row linked to the previous one.
 * Used by Stripe webhook on subscription renewal events.
 */
export async function renewMembership(expiredMembershipId: string, schoolId: string, startDate?: Date) {
  const expired = await prisma.membership.findFirst({
    where: { id: expiredMembershipId, schoolId },
    include: { plan: true },
  })
  if (!expired) throw new Error('Membership not found')
  if (!expired.planId) throw new Error('Cannot renew a plan-less membership')

  const schoolMember = await prisma.schoolMember.findFirst({
    where: { userId: expired.userId, schoolId },
    select: { id: true },
  })
  if (!schoolMember) throw new Error('School member not found')

  return assignPlan({
    schoolMemberId: schoolMember.id,
    schoolId,
    planId: expired.planId,
    startDate: startDate ?? expired.endDate ?? new Date(),
    paymentMethod: expired.paymentMethod,
    stripeSubId: expired.stripeSubId ?? undefined,
    renewedFromId: expired.id,
  })
}

/**
 * Check if a user has active access to a given school.
 * Returns the active membership or null.
 */
export async function getActiveMembership(userId: string, schoolId: string) {
  return prisma.membership.findFirst({
    where: { userId, schoolId, status: MembershipStatus.ACTIVE },
    include: { plan: { select: { name: true, planType: true, classAccess: true } } },
    orderBy: { startDate: 'desc' },
  })
}
