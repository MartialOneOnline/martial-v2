/**
 * MembershipService — single source of truth for membership lifecycle.
 *
 * All assignment, cancellation, renewal, and access-check logic lives here.
 * Both the admin API route and the Stripe webhook call these functions,
 * guaranteeing identical behaviour regardless of how a membership was created.
 */

import { prisma } from '@/lib/db'
import type { Prisma } from '@/lib/prisma-client/client'
import { PaymentMethod, MembershipStatus, TransactionType, TransactionCategory, TransactionStatus } from '@/lib/prisma-client/enums'
import { sendMembershipReceiptEmail } from '@/lib/email/sendEmails'
import { getStripe } from '@/lib/stripe'

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

// ── Lifecycle sync helpers ────────────────────────────────────────────────────
//
// These react to a Membership status change by projecting it onto the linked
// SchoolMember record — used by the admin pause/resume/cancel routes and by
// the Stripe webhook's subscription lifecycle events (invoice.payment_failed,
// invoice.payment_succeeded, customer.subscription.deleted/updated), so a
// subscription going stale/renewing/cancelling on Stripe's side keeps the
// school's member list in sync instead of silently drifting from it.

/** True if the user has another ACTIVE membership at this school (besides `excludeMembershipId`, if given). */
export async function hasOtherActiveMembership(
  tx: Prisma.TransactionClient,
  input: { userId: string; schoolId: string; excludeMembershipId?: string },
): Promise<boolean> {
  const { userId, schoolId, excludeMembershipId } = input
  const other = await tx.membership.findFirst({
    where: {
      userId, schoolId, status: MembershipStatus.ACTIVE,
      ...(excludeMembershipId && { id: { not: excludeMembershipId } }),
    },
    select: { id: true },
  })
  return !!other
}

/** True if this user already has an ARCHIVED SchoolMember row at this school. */
export async function isSchoolMemberArchived(
  tx: Prisma.TransactionClient,
  input: { userId: string; schoolId: string },
): Promise<boolean> {
  const member = await tx.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId: input.schoolId, userId: input.userId } },
    select: { status: true },
  })
  return member?.status === 'ARCHIVED'
}

/**
 * Projects a Membership status onto the linked SchoolMember record,
 * conservatively:
 *   ACTIVE    -> SchoolMember ACTIVE
 *   PAUSED    -> SchoolMember FROZEN
 *   CANCELLED -> SchoolMember INACTIVE, but only if the user has no other
 *                ACTIVE membership at this school — a second plan/bono
 *                shouldn't lose the student their access because a
 *                different one ended.
 *   anything else (PENDING/EXPIRED) -> no defined projection, left as-is.
 *
 * ARCHIVED is never touched or reactivated by this function — a staff
 * member archived this person for a reason, and a subscription lifecycle
 * event must not silently undo that moderation decision.
 *
 * Must be called inside the same transaction as the Membership status
 * write it's reacting to, so the two updates land atomically.
 */
export async function syncSchoolMemberStatusForMembership(
  tx: Prisma.TransactionClient,
  input: { userId: string; schoolId: string; membershipStatus: MembershipStatus; excludeMembershipId?: string },
) {
  const { userId, schoolId, membershipStatus, excludeMembershipId } = input

  let targetStatus: 'ACTIVE' | 'FROZEN' | 'INACTIVE'
  if (membershipStatus === MembershipStatus.ACTIVE) {
    targetStatus = 'ACTIVE'
  } else if (membershipStatus === MembershipStatus.PAUSED) {
    targetStatus = 'FROZEN'
  } else if (membershipStatus === MembershipStatus.CANCELLED) {
    if (await hasOtherActiveMembership(tx, { userId, schoolId, excludeMembershipId })) return
    targetStatus = 'INACTIVE'
  } else {
    return
  }

  await tx.schoolMember.updateMany({
    where: { userId, schoolId, status: { not: 'ARCHIVED' } },
    data: { status: targetStatus },
  })
}

/**
 * Cancels (or schedules the cancellation of) a Stripe subscription, awaited
 * so the caller only commits a local status change once Stripe has actually
 * confirmed it — a fire-and-forget call here could leave the local record
 * saying "cancelled" while Stripe silently keeps billing the customer.
 */
export async function cancelStripeSubscription(
  stripe: ReturnType<typeof getStripe>,
  stripeSubId: string,
  policy: 'IMMEDIATE' | 'UNTIL_END_OF_PERIOD',
): Promise<void> {
  try {
    if (policy === 'IMMEDIATE') {
      await stripe.subscriptions.cancel(stripeSubId)
    } else {
      await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true })
    }
  } catch (err) {
    throw new Error(`Stripe subscription cancel failed: ${err instanceof Error ? err.message : String(err)}`)
  }
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
          paymentMethod: (paymentMethod ?? PaymentMethod.CASH),
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

  // Send receipt email for paid plans
  if (plan.price > 0) {
    const userRecord = await prisma.user.findUnique({
      where: { id: schoolMember.userId },
      select: { email: true, name: true },
    })
    const schoolRecord = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, city: true, language: true },
    })
    if (userRecord?.email && schoolRecord) {
      sendMembershipReceiptEmail({
        to: userRecord.email,
        studentName: userRecord.name,
        schoolName: schoolRecord.name,
        schoolCity: schoolRecord.city,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: (paymentMethod ?? PaymentMethod.CASH).toString(),
        startDate: start,
        endDate,
        membershipId: membership.id,
        lang: schoolRecord.language,
      }).catch(err => console.error('[assignPlan] receipt email failed:', err))
    }
  }

  return membership
}

/**
 * Cancel an active membership (soft cancel — keeps the record).
 *
 * Respects the school's cancelPolicy:
 * - IMMEDIATE: access ends now → Membership CANCELLED + SchoolMember INACTIVE
 *   (unless another ACTIVE membership covers the same user+school).
 * - UNTIL_END_OF_PERIOD: marks cancelledAt but keeps Membership ACTIVE until endDate.
 *   SchoolMember transitions to INACTIVE lazily when endDate passes (checkAndExpireMembership).
 *
 * TRIAL plans always cancel immediately regardless of school policy.
 *
 * If a Stripe subscription is attached, Stripe is cancelled (or scheduled to
 * cancel at period end) *first*, awaited — local state is only written once
 * Stripe has confirmed. A fire-and-forget call here could leave the local
 * record saying "cancelled" while Stripe silently keeps billing the
 * customer; if the Stripe call throws, this function throws too and no
 * local write happens, so local and Stripe never drift out of sync.
 */
export async function cancelMembership(input: CancelMembershipInput) {
  const { membershipId, schoolId, reason } = input

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId },
    include: {
      plan: { select: { planType: true } },
      school: { select: { cancelPolicy: true, stripeSecretKey: true } },
    },
  })
  if (!membership) throw new Error('Membership not found')
  if (membership.status === MembershipStatus.CANCELLED) throw new Error('Already cancelled')

  const isTrial = membership.plan?.planType === 'TRIAL'
  const policy = membership.school?.cancelPolicy ?? 'IMMEDIATE'
  const immediate = isTrial || policy === 'IMMEDIATE' || !membership.endDate

  const updatedNotes = reason
    ? [membership.notes, `Cancelled: ${reason}`].filter(Boolean).join(' | ')
    : membership.notes

  if (membership.stripeSubId && membership.school?.stripeSecretKey) {
    await cancelStripeSubscription(
      getStripe(membership.school.stripeSecretKey),
      membership.stripeSubId,
      immediate ? 'IMMEDIATE' : 'UNTIL_END_OF_PERIOD',
    )
  }

  if (immediate) {
    await prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membershipId },
        data: { status: MembershipStatus.CANCELLED, cancelledAt: new Date(), notes: updatedNotes },
      })
      await syncSchoolMemberStatusForMembership(tx, {
        userId: membership.userId, schoolId, membershipStatus: MembershipStatus.CANCELLED, excludeMembershipId: membershipId,
      })
    })
  } else {
    // Netflix model: mark intent, keep access until endDate — SchoolMember untouched.
    await prisma.membership.update({
      where: { id: membershipId },
      data: { cancelledAt: new Date(), notes: updatedNotes },
    })
  }

  return prisma.membership.findUnique({ where: { id: membershipId } })
}

/**
 * Lazy expiration check — call at any access-verification point.
 *
 * If the membership has cancelledAt set and its endDate has passed,
 * transitions it to CANCELLED and marks SchoolMember INACTIVE.
 * Returns true if the membership is expired (no longer has access).
 */
export async function checkAndExpireMembership(membershipId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true, schoolId: true, status: true, cancelledAt: true, endDate: true },
  })
  if (!membership) return true
  if (membership.status === MembershipStatus.CANCELLED) return true
  if (!membership.cancelledAt || !membership.endDate) return false
  if (membership.endDate > new Date()) return false

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.CANCELLED },
    })
    await syncSchoolMemberStatusForMembership(tx, {
      userId: membership.userId, schoolId: membership.schoolId, membershipStatus: MembershipStatus.CANCELLED, excludeMembershipId: membershipId,
    })
  })

  return true
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
