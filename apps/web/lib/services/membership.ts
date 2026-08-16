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
import { convertLeadOnMembershipActivation } from '@/lib/leads'

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
  /**
   * Manual end-date override — only honored when paymentMethod is CASH.
   * Stripe/Revolut-driven dates must always match the provider's billing
   * state, so the override is silently ignored for any other method
   * (server-side guard, independent of what the UI sends).
   */
  endDateOverride?: Date | null
}

export interface CancelMembershipInput {
  membershipId: string
  schoolId:     string
  reason?:      string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Grace period (days) after endDate before a lapsed ACTIVE membership is
 * actually expired/cancelled — matches V1's default (a subscription past
 * its renewal date keeps access for 30 days before being cut off), so a
 * membership that's merely a few days overdue (e.g. paid in cash but not
 * renewed in the system yet) doesn't lose access the moment the cron runs.
 */
const EXPIRY_GRACE_PERIOD_DAYS = 30

function graceCutoff(): Date {
  const d = new Date()
  d.setDate(d.getDate() - EXPIRY_GRACE_PERIOD_DAYS)
  return d
}

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
 *   ACTIVE              -> SchoolMember ACTIVE
 *   PAUSED               -> SchoolMember FROZEN
 *   CANCELLED / EXPIRED -> SchoolMember INACTIVE, but only if the user has
 *                no other ACTIVE membership at this school — a second
 *                plan/bono shouldn't lose the student their access because
 *                a different one ended or lapsed.
 *   anything else (PENDING) -> no defined projection, left as-is.
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
  } else if (membershipStatus === MembershipStatus.CANCELLED || membershipStatus === MembershipStatus.EXPIRED) {
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

export interface DriftedSchoolMember {
  id: string
  userId: string
  schoolId: string
  schoolName: string
  status: string
  userName: string | null
  userEmail: string
}

/**
 * SchoolMember rows whose status contradicts a currently ACTIVE Membership
 * at the same school (e.g. status stuck at INACTIVE while the user has an
 * active paid plan) — the exact drift assignPlan() used to leave behind
 * before it was fixed to reactivate on assignment. Should be empty in
 * steady state; exists as a monitoring safety net for other paths that can
 * still touch SchoolMember.status (Stripe webhooks, CSV imports, manual
 * admin edits) — see the "Needs attention" panels in the school dashboard
 * and superadmin panel.
 *
 * Pass schoolId to scope to one school; omit for a platform-wide scan.
 */
export async function findMembershipStatusDrift(schoolId?: string): Promise<DriftedSchoolMember[]> {
  const candidates = await prisma.schoolMember.findMany({
    where: { status: { in: ['INACTIVE', 'PENDING', 'LEAD', 'FROZEN'] }, ...(schoolId && { schoolId }) },
    select: {
      id: true, status: true, userId: true, schoolId: true,
      user: { select: { name: true, email: true } },
      school: { select: { name: true } },
    },
  })
  if (candidates.length === 0) return []

  const activeMemberships = await prisma.membership.findMany({
    where: {
      status: MembershipStatus.ACTIVE,
      OR: candidates.map(c => ({ userId: c.userId, schoolId: c.schoolId })),
    },
    select: { userId: true, schoolId: true },
  })
  const activeSet = new Set(activeMemberships.map(m => `${m.userId}:${m.schoolId}`))

  return candidates
    .filter(c => activeSet.has(`${c.userId}:${c.schoolId}`))
    .map(c => ({
      id: c.id,
      userId: c.userId,
      schoolId: c.schoolId,
      schoolName: c.school?.name ?? '',
      status: c.status,
      userName: c.user?.name ?? null,
      userEmail: c.user?.email ?? '',
    }))
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
 *  6. Reactivates SchoolMember.status (PENDING/LEAD/INACTIVE → ACTIVE), unless ARCHIVED
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

  const endDate = (paymentMethod === PaymentMethod.CASH && input.endDateOverride)
    ? input.endDateOverride
    : computeEndDate(plan.planType, plan.billingCycle, plan.validityDays, start)

  // 3–6. All in one transaction
  const [membership] = await prisma.$transaction(async (tx) => {
    // Cancel existing active memberships
    const previouslyActive = await tx.membership.findMany({
      where: { userId: schoolMember.userId, schoolId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    })
    await tx.membership.updateMany({
      where: { userId: schoolMember.userId, schoolId, status: MembershipStatus.ACTIVE },
      data: { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
    })

    // A new plan assignment (same or different) supersedes any cash renewal
    // payment still awaiting collection on the membership(s) it replaces —
    // otherwise it'd sit PENDING in Transactions forever.
    if (previouslyActive.length > 0) {
      await tx.transaction.updateMany({
        where: { membershipId: { in: previouslyActive.map(m => m.id) }, status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.CANCELLED },
      })
    }

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

    // Reactivate the member unless a staff member archived them — assigning
    // a fresh active plan should always restore access (PENDING/LEAD/INACTIVE
    // → ACTIVE), same exception ARCHIVED gets in syncSchoolMemberStatusForMembership.
    if (schoolMember.status !== 'ARCHIVED' && schoolMember.status !== 'ACTIVE') {
      await tx.schoolMember.update({
        where: { id: schoolMemberId },
        data: { status: 'ACTIVE' },
      })
    }

    return [m]
  })

  // A newly-ACTIVE membership is the actual conversion event for the CRM —
  // fire-and-forget, must never fail the assignment itself.
  convertLeadOnMembershipActivation(schoolId, schoolMember.userId).catch(err =>
    console.error('[assignPlan] lead conversion failed:', err))

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
      // A cancelled membership has nothing left to renew — clear any cash
      // renewal payment still awaiting collection, same cleanup assignPlan
      // does when a membership is superseded.
      await tx.transaction.updateMany({
        where: { membershipId, status: TransactionStatus.PENDING },
        data: { status: TransactionStatus.CANCELLED },
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
    // They're leaving at period end — no next cycle to collect for.
    await prisma.transaction.updateMany({
      where: { membershipId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.CANCELLED },
    })
  }

  return prisma.membership.findUnique({ where: { id: membershipId } })
}

/**
 * Transitions one lapsed ACTIVE membership (endDate already in the past) to
 * its terminal status and syncs the linked SchoolMember, inside a single
 * transaction. Shared by the lazy per-membership check and the bulk cron
 * sweep so both apply the exact same rule:
 *   - cancelledAt set   -> CANCELLED (the "Netflix" cancel-at-period-end case)
 *   - cancelledAt unset -> EXPIRED   (nobody renewed it in time)
 */
async function expireOneMembership(membership: {
  id: string; userId: string; schoolId: string; cancelledAt: Date | null
}) {
  const newStatus = membership.cancelledAt ? MembershipStatus.CANCELLED : MembershipStatus.EXPIRED

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: membership.id },
      data: { status: newStatus },
    })
    await syncSchoolMemberStatusForMembership(tx, {
      userId: membership.userId, schoolId: membership.schoolId, membershipStatus: newStatus, excludeMembershipId: membership.id,
    })
  })

  return newStatus
}

/**
 * Lazy expiration check — call at any access-verification point.
 *
 * If the membership is ACTIVE and its endDate passed more than
 * EXPIRY_GRACE_PERIOD_DAYS ago, transitions it to CANCELLED (if the
 * student had already requested cancellation) or EXPIRED (if it simply
 * lapsed without ever being cancelled), and syncs SchoolMember
 * accordingly. Returns true if the membership no longer grants access.
 */
export async function checkAndExpireMembership(membershipId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true, schoolId: true, status: true, cancelledAt: true, endDate: true },
  })
  if (!membership) return true
  if (membership.status === MembershipStatus.CANCELLED || membership.status === MembershipStatus.EXPIRED) return true
  if (membership.status !== MembershipStatus.ACTIVE) return false // PENDING/PAUSED — nothing to expire here
  if (!membership.endDate || membership.endDate > graceCutoff()) return false

  await expireOneMembership(membership)
  return true
}

export interface LapsedMembershipPreview {
  id: string
  userId: string
  schoolId: string
  schoolName: string
  userName: string | null
  userEmail: string
  planName: string
  endDate: Date
  willBecome: 'EXPIRED' | 'CANCELLED'
}

/**
 * Bulk sweep for the daily cron job (see app/api/cron/expire-memberships):
 * finds every ACTIVE membership whose endDate passed more than
 * EXPIRY_GRACE_PERIOD_DAYS ago and expires it, one at a time so each gets
 * its own transaction and SchoolMember sync. Nothing else in the codebase
 * runs this periodically — without it, lapsed-but-never-cancelled
 * memberships stay ACTIVE (and inflate the "active members" KPIs) forever.
 *
 * `dryRun: true` runs the same lookup but performs no writes — instead it
 * returns a `preview` of every affected membership (who, which school,
 * what it would become) so this can be reviewed before the first real run
 * touches production data. See scripts/check-lapsed-memberships.ts.
 */
export async function expireLapsedMemberships(
  options: { dryRun?: boolean } = {},
): Promise<{ expiredCount: number; cancelledCount: number; preview?: LapsedMembershipPreview[] }> {
  const lapsed = await prisma.membership.findMany({
    where: { status: MembershipStatus.ACTIVE, endDate: { lt: graceCutoff() } },
    select: {
      id: true, userId: true, schoolId: true, cancelledAt: true, endDate: true, planName: true,
      user: { select: { name: true, email: true } },
      school: { select: { name: true } },
    },
  })

  if (options.dryRun) {
    const preview: LapsedMembershipPreview[] = lapsed.map(m => ({
      id: m.id,
      userId: m.userId,
      schoolId: m.schoolId,
      schoolName: m.school?.name ?? '',
      userName: m.user?.name ?? null,
      userEmail: m.user?.email ?? '',
      planName: m.planName,
      endDate: m.endDate as Date,
      willBecome: m.cancelledAt ? 'CANCELLED' : 'EXPIRED',
    }))
    return {
      expiredCount: preview.filter(p => p.willBecome === 'EXPIRED').length,
      cancelledCount: preview.filter(p => p.willBecome === 'CANCELLED').length,
      preview,
    }
  }

  let expiredCount = 0
  let cancelledCount = 0
  for (const membership of lapsed) {
    const status = await expireOneMembership(membership)
    if (status === MembershipStatus.EXPIRED) expiredCount++
    else cancelledCount++
  }

  return { expiredCount, cancelledCount }
}

export interface CreateRenewalPaymentInput {
  membershipId: string
  schoolId: string
}

/**
 * Creates a PENDING renewal Transaction for a CASH membership so staff have
 * something to collect and mark paid — cash memberships have no auto-billing
 * to fall back on the way Stripe/Revolut subscriptions do. Safe to call
 * repeatedly (from the manual UI trigger or the daily cron sweep below):
 * if a PENDING renewal already exists for this membership, it's returned
 * as-is instead of creating a duplicate.
 */
export async function createRenewalPayment(input: CreateRenewalPaymentInput) {
  const { membershipId, schoolId } = input

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, schoolId },
    include: { plan: { select: { planType: true, billingCycle: true, validityDays: true } } },
  })
  if (!membership) throw new Error('Membership not found')
  if (membership.paymentMethod !== PaymentMethod.CASH) {
    throw new Error('Renewal payments only apply to cash-paid memberships')
  }
  if (membership.status !== MembershipStatus.ACTIVE) {
    throw new Error('Membership must be active to create a renewal payment')
  }
  if (membership.cancelledAt) {
    throw new Error('Membership is already set to cancel at period end — nothing to renew')
  }

  const existing = await prisma.transaction.findFirst({
    where: { membershipId, status: TransactionStatus.PENDING, category: TransactionCategory.MEMBERSHIP },
  })
  if (existing) return existing

  const periodStart = membership.endDate ?? membership.startDate
  // Imported/legacy memberships often carry no planId (see prisma/seed-rgm-payments.ts),
  // so fall back to repeating the membership's own start→end span when there's no
  // MembershipPlan to read a billing cycle from — otherwise periodEnd would be null
  // and marking the renewal paid would never actually push endDate forward.
  const periodEnd = membership.plan
    ? computeEndDate(membership.plan.planType, membership.plan.billingCycle, membership.plan.validityDays, periodStart)
    : (membership.endDate
        ? new Date(periodStart.getTime() + (membership.endDate.getTime() - membership.startDate.getTime()))
        : null)

  return prisma.transaction.create({
    data: {
      schoolId,
      userId: membership.userId,
      membershipId,
      type: TransactionType.INCOME,
      status: TransactionStatus.PENDING,
      category: TransactionCategory.MEMBERSHIP,
      paymentMethod: PaymentMethod.CASH,
      amount: membership.price,
      currency: membership.currency,
      description: `${membership.planName} — renewal`,
      date: new Date(),
      periodStart,
      periodEnd,
    },
  })
}

/**
 * Daily sweep (see app/api/cron/expire-memberships): generates a PENDING
 * renewal payment for every ACTIVE cash membership whose endDate has just
 * passed, so staff see something to collect right at expiration — distinct
 * from EXPIRY_GRACE_PERIOD_DAYS below, which is how long an unpaid renewal
 * is tolerated before the membership actually lapses.
 */
export async function generateDueRenewalPayments(): Promise<{ createdCount: number }> {
  const due = await prisma.membership.findMany({
    where: {
      status: MembershipStatus.ACTIVE, paymentMethod: PaymentMethod.CASH, endDate: { lte: new Date() },
      cancelledAt: null, // already headed for CANCELLED at endDate — nothing to renew
    },
    select: { id: true, schoolId: true },
  })

  let createdCount = 0
  for (const membership of due) {
    const existing = await prisma.transaction.findFirst({
      where: { membershipId: membership.id, status: TransactionStatus.PENDING, category: TransactionCategory.MEMBERSHIP },
      select: { id: true },
    })
    if (existing) continue
    await createRenewalPayment({ membershipId: membership.id, schoolId: membership.schoolId })
    createdCount++
  }

  return { createdCount }
}

export interface MarkRenewalPaidInput {
  transactionId: string
  schoolId: string
}

/**
 * Pushes the Membership linked to a just-paid Transaction forward to the
 * transaction's periodEnd and (re)activates it — the "same membership, just
 * extended" resolution, as opposed to assignPlan's "cancel old, create new"
 * resolution. Shared by markRenewalPaid (the profile page's dedicated
 * "Mark as Paid" flow) and the generic Transactions-list status change, so
 * a renewal payment has the same effect on the membership regardless of
 * which screen the admin marks it paid from. No-op if the transaction isn't
 * linked to a membership. Must run inside the same transaction as the
 * Transaction.status write so both land atomically.
 */
async function activateMembershipForPaidRenewal(
  tx: Prisma.TransactionClient,
  txn: { membershipId: string | null; periodEnd: Date | null },
  schoolId: string,
) {
  if (!txn.membershipId) return null
  const membership = await tx.membership.findFirst({ where: { id: txn.membershipId, schoolId } })
  if (!membership) return null

  const newEndDate = txn.periodEnd ?? membership.endDate

  const updated = await tx.membership.update({
    where: { id: membership.id },
    data: { status: MembershipStatus.ACTIVE, endDate: newEndDate },
  })
  await syncSchoolMemberStatusForMembership(tx, {
    userId: membership.userId, schoolId, membershipStatus: MembershipStatus.ACTIVE,
  })
  return updated
}

/**
 * Resolves a pending cash renewal: flips the Transaction to PAID and extends
 * the linked Membership via activateMembershipForPaidRenewal.
 */
export async function markRenewalPaid(input: MarkRenewalPaidInput) {
  const { transactionId, schoolId } = input

  const txn = await prisma.transaction.findFirst({ where: { id: transactionId, schoolId } })
  if (!txn) throw new Error('Transaction not found')
  if (txn.status !== TransactionStatus.PENDING) throw new Error('Transaction is not pending')
  if (!txn.membershipId) throw new Error('Transaction is not linked to a membership')

  const updated = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({ where: { id: transactionId }, data: { status: TransactionStatus.PAID, date: new Date() } })
    return activateMembershipForPaidRenewal(tx, txn, schoolId)
  })

  if (!updated) throw new Error('Membership not found')
  return updated
}

export interface ApplyPaidMembershipTransactionInput {
  transactionId: string
  schoolId: string
}

/**
 * Called when a Transaction linked to a Membership transitions to PAID from
 * the generic Transactions-list status change (as opposed to the profile
 * page's dedicated renewal flow, which calls markRenewalPaid directly) — so
 * both paths keep the membership's endDate/status in sync with its
 * transactions. No-op if the transaction isn't linked to a membership.
 */
export async function applyPaidMembershipTransaction(input: ApplyPaidMembershipTransactionInput) {
  const { transactionId, schoolId } = input
  return prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findFirst({ where: { id: transactionId, schoolId } })
    if (!txn) return null
    return activateMembershipForPaidRenewal(tx, txn, schoolId)
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
