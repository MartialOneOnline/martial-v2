import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'
import { cancelMembership, syncSchoolMemberStatusForMembership } from '@/lib/services/membership'
import { sendMembershipRequestEmail } from '@/lib/email/sendEmails'
import { notifyMembershipRequest } from '@/lib/notifications/create'

// PATCH /api/my/memberships/[id] — pause, resume, or cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findUnique({
    where: { id },
    select: { id: true, userId: true, schoolId: true, status: true, planId: true },
  })
  if (!membership || membership.userId !== dbUser.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action } = await req.json() as { action: 'pause' | 'resume' | 'cancel' }

  const allowed: Record<string, string[]> = {
    pause:  ['ACTIVE'],
    resume: ['PAUSED'],
    cancel: ['ACTIVE', 'PAUSED'],
  }
  if (!allowed[action]?.includes(membership.status))
    return NextResponse.json({ error: `Cannot ${action} a ${membership.status} membership` }, { status: 400 })

  if (action === 'cancel') {
    // Delegates to service — respects school cancelPolicy + syncs SchoolMember
    try {
      const updated = await cancelMembership({ membershipId: id, schoolId: membership.schoolId })
      return NextResponse.json({ status: updated?.status })
    } catch (err) {
      // Covers both business errors (already cancelled) and a failed Stripe
      // API call — cancelMembership only throws the latter *before* writing
      // any local state, so nothing here needs rolling back.
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Cancellation failed' }, { status: 400 })
    }
  }

  // pause / resume — sync SchoolMember status atomically
  const newMembershipStatus = action === 'pause' ? MembershipStatus.PAUSED : MembershipStatus.ACTIVE

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id },
      data: { status: newMembershipStatus },
    })
    await syncSchoolMemberStatusForMembership(tx, {
      userId: membership.userId, schoolId: membership.schoolId, membershipStatus: newMembershipStatus,
    })
  })

  return NextResponse.json({ status: newMembershipStatus })
}

// POST /api/my/memberships/[id] — request a plan (create PENDING membership)
// This endpoint is for a new membership request, id = planId here
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, schoolId: true, name: true, price: true, currency: true, isPublic: true, isActive: true, paymentMethods: true },
  })
  if (!plan || !plan.isPublic || !plan.isActive)
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const manualMethods = ['CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'OTHER'] as const
  const { paymentMethod: requestedMethod } = await req.json().catch(() => ({})) as { paymentMethod?: string }
  const paymentMethod = requestedMethod && manualMethods.includes(requestedMethod as typeof manualMethods[number])
    && plan.paymentMethods.includes(requestedMethod)
    ? (requestedMethod as PaymentMethod)
    : (manualMethods.find(m => plan.paymentMethods.includes(m)) as PaymentMethod | undefined) ?? PaymentMethod.CASH

  // Check student belongs to this school
  const member = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: plan.schoolId },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check no active/pending/paused membership for this plan already
  // PENDING is included so students can't spam multiple requests for the same plan
  const existing = await prisma.membership.findFirst({
    where: { userId: dbUser.id, planId: plan.id, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
  })
  if (existing) return NextResponse.json({ error: 'Already have this plan' }, { status: 409 })

  const membership = await prisma.membership.create({
    data: {
      userId: dbUser.id,
      schoolId: plan.schoolId,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      paymentMethod,
      status: MembershipStatus.PENDING,
      // startDate is intentionally set to now as a placeholder — it will be
      // overwritten with the real activation date when the admin approves.
      // Prisma requires a non-null startDate, so we use the request time.
      startDate: new Date(),
    },
  })

  // Notify school OWNER + ADMIN only for manual payment methods (cash, bank transfer, etc.)
  // Stripe payments are handled automatically via webhook — no admin approval needed
  const isManualPayment = ['CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'OTHER'].includes(membership.paymentMethod)

  if (isManualPayment) {
    notifyMembershipRequest(plan.schoolId, dbUser.name ?? 'Alumno', plan.name)
  }

  if (isManualPayment) prisma.schoolMember.findMany({
    where: {
      schoolId: plan.schoolId,
      role: { in: ['OWNER', 'ADMIN'] },
      status: { not: 'INACTIVE' },
    },
    include: {
      user: { select: { name: true, email: true } },
      school: { select: { name: true, city: true, language: true } },
    },
  }).then(admins => {
    const school = admins[0]?.school
    return Promise.allSettled(
      admins
        .filter(a => a.user?.email)
        .map(a =>
          sendMembershipRequestEmail({
            to:          a.user.email!,
            adminName:   a.user.name,
            studentName: dbUser.name ?? plan.name,
            schoolName:  school?.name ?? plan.name,
            schoolCity:  school?.city ?? null,
            planName:    plan.name,
            price:       Number(plan.price),
            currency:    plan.currency,
            requestedAt: new Date(),
            lang:        school?.language ?? 'en',
          })
        )
    )
  }).catch(err => console.error('[membership request] admin notification failed:', err))

  return NextResponse.json({ membershipId: membership.id, status: membership.status }, { status: 201 })
}
