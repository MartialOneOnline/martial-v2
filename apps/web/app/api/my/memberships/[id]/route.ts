import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'
import { cancelMembership } from '@/lib/services/membership'

async function getDbUser(authId: string) {
  return prisma.user.findUnique({ where: { supabaseAuthId: authId }, select: { id: true } })
}

// PATCH /api/my/memberships/[id] — pause, resume, or cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getDbUser(authUser.id)
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
    const updated = await cancelMembership({ membershipId: id, schoolId: membership.schoolId })
    return NextResponse.json({ status: updated?.status })
  }

  // pause / resume — sync SchoolMember status atomically
  const newMembershipStatus = action === 'pause' ? MembershipStatus.PAUSED : MembershipStatus.ACTIVE
  const newMemberStatus = action === 'pause' ? 'FROZEN' : 'ACTIVE'

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id },
      data: { status: newMembershipStatus },
    })
    await tx.schoolMember.updateMany({
      where: { userId: membership.userId, schoolId: membership.schoolId },
      data: { status: newMemberStatus },
    })
  })

  return NextResponse.json({ status: newMembershipStatus })
}

// POST /api/my/memberships/[id] — request a plan (create PENDING membership)
// This endpoint is for a new membership request, id = planId here
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getDbUser(authUser.id)
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, schoolId: true, name: true, price: true, currency: true, isPublic: true, isActive: true },
  })
  if (!plan || !plan.isPublic || !plan.isActive)
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

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
      paymentMethod: PaymentMethod.CASH,
      status: MembershipStatus.PENDING,
      // startDate is intentionally set to now as a placeholder — it will be
      // overwritten with the real activation date when the admin approves.
      // Prisma requires a non-null startDate, so we use the request time.
      startDate: new Date(),
    },
  })

  return NextResponse.json({ membershipId: membership.id, status: membership.status }, { status: 201 })
}
