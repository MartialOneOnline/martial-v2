import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { assignPlan, cancelMembership } from '@/lib/services/membership'
import { MembershipStatus } from '@/lib/prisma-client/enums'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role))
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
      planId: true, paymentMethod: true, notes: true,
    },
  })
  if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const { action } = await req.json() as { action: 'activate' | 'pause' | 'resume' | 'cancel' }

  // ── activate: PENDING → ACTIVE ────────────────────────────────────────────────
  if (action === 'activate') {
    if (membership.status !== 'PENDING')
      return NextResponse.json({ error: `Cannot activate a ${membership.status} membership` }, { status: 400 })
    if (!membership.planId)
      return NextResponse.json({ error: 'Membership has no plan' }, { status: 400 })

    const schoolMember = await prisma.schoolMember.findFirst({
      where: { userId: membership.userId, schoolId: auth.schoolId },
      select: { id: true },
    })
    if (!schoolMember)
      return NextResponse.json({ error: 'School member not found' }, { status: 404 })

    // Cancel the PENDING record and re-assign via service (sets dates, creates transaction, syncs SchoolMember)
    await prisma.membership.update({
      where: { id },
      data: { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
    })

    const activated = await assignPlan({
      schoolMemberId: schoolMember.id,
      schoolId:       auth.schoolId,
      planId:         membership.planId,
      paymentMethod:  membership.paymentMethod,
      notes:          membership.notes ?? undefined,
    })
    return NextResponse.json({ status: activated.status, id: activated.id })
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
