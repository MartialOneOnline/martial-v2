import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { cancelMembership, computeEndDate } from '@/lib/services/membership'
import { MembershipStatus, TransactionType, TransactionStatus, TransactionCategory } from '@/lib/prisma-client/enums'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.memberships.manage'))
        return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

/**
 * PATCH /api/dashboard/memberships/[id]
 * Actions: activate | pause | resume | cancel
 *
 * activate — PENDING → ACTIVE (re-runs assignPlan to set dates + create transaction)
 * pause    — ACTIVE  → PAUSED  + SchoolMember FROZEN
 * resume   — PAUSED  → ACTIVE  + SchoolMember ACTIVE
 * cancel   — any     → CANCELLED (respects school cancelPolicy via cancelMembership service)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const membership = await prisma.membership.findFirst({
    where: { id, schoolId: auth.schoolId },
    select: {
      id: true, userId: true, schoolId: true, status: true,
      planId: true, planName: true, paymentMethod: true, notes: true,
      price: true, currency: true,
    },
  })
  if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const { action } = await req.json() as { action: 'activate' | 'pause' | 'resume' | 'cancel' }

  // ── activate: PENDING → ACTIVE ────────────────────────────────────────────────
  //
  // We update the PENDING membership IN-PLACE rather than calling assignPlan().
  // assignPlan() would cancel ALL existing ACTIVE memberships for this user+school,
  // which is wrong when the student already has an active subscription and is simply
  // adding a separate bono/pass. Updating in-place:
  //   • preserves the membership ID (history intact)
  //   • does not touch other memberships
  //   • is fully atomic inside a single $transaction
  if (action === 'activate') {
    if (membership.status !== 'PENDING')
      return NextResponse.json({ error: `Cannot activate a ${membership.status} membership` }, { status: 400 })
    if (!membership.planId)
      return NextResponse.json({ error: 'Membership has no plan' }, { status: 400 })

    // Fetch plan to compute proper start/end dates
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: membership.planId, schoolId: auth.schoolId },
      select: { planType: true, billingCycle: true, validityDays: true },
    })
    if (!plan)
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 })

    const startDate = new Date()
    const endDate   = computeEndDate(plan.planType, plan.billingCycle ?? '', plan.validityDays, startDate)
    const price     = Number(membership.price)

    await prisma.$transaction(async (tx) => {
      // 1. Activate in-place — preserve ID, avoid cancelling sibling memberships
      await tx.membership.update({
        where: { id },
        data: { status: MembershipStatus.ACTIVE, startDate, endDate, cancelledAt: null },
      })

      // 2. Record income transaction (skip for free/trial plans)
      if (price > 0) {
        await tx.transaction.create({
          data: {
            schoolId:      auth.schoolId,
            userId:        membership.userId,
            membershipId:  id,
            type:          TransactionType.INCOME,
            status:        TransactionStatus.PAID,
            category:      TransactionCategory.MEMBERSHIP,
            paymentMethod: membership.paymentMethod,
            amount:        price,
            currency:      membership.currency,
            description:   `${membership.planName} — activated`,
            date:          startDate,
            notes:         membership.notes ?? null,
          },
        })
      }

      // 3. Promote SchoolMember only if still in PENDING or LEAD state
      //    (never downgrade an ACTIVE/FROZEN member)
      await tx.schoolMember.updateMany({
        where: {
          userId:   membership.userId,
          schoolId: auth.schoolId,
          status:   { in: ['PENDING', 'LEAD'] },
        },
        data: { status: 'ACTIVE' },
      })
    })

    return NextResponse.json({ status: 'ACTIVE', id })
  }

  // ── pause: ACTIVE → PAUSED ────────────────────────────────────────────────────
  if (action === 'pause') {
    if (membership.status !== 'ACTIVE')
      return NextResponse.json({ error: `Cannot pause a ${membership.status} membership` }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id }, data: { status: MembershipStatus.PAUSED } })
      await tx.schoolMember.updateMany({
        where: { userId: membership.userId, schoolId: auth.schoolId },
        data: { status: 'FROZEN' },
      })
    })
    return NextResponse.json({ status: 'PAUSED' })
  }

  // ── resume: PAUSED → ACTIVE ───────────────────────────────────────────────────
  if (action === 'resume') {
    if (membership.status !== 'PAUSED')
      return NextResponse.json({ error: `Cannot resume a ${membership.status} membership` }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id }, data: { status: MembershipStatus.ACTIVE } })
      await tx.schoolMember.updateMany({
        where: { userId: membership.userId, schoolId: auth.schoolId },
        data: { status: 'ACTIVE' },
      })
    })
    return NextResponse.json({ status: 'ACTIVE' })
  }

  // ── cancel ────────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    const updated = await cancelMembership({ membershipId: id, schoolId: auth.schoolId })
    return NextResponse.json({ status: updated?.status })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
