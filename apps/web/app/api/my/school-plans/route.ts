import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

// GET /api/my/school-plans — public membership plans for the student's
// active school, scoped so a dual-school student isn't offered plans from a
// school they aren't currently browsing as.
export async function GET() {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // A student in 2+ schools would otherwise be offered every school's plans
  // mixed together — see getActiveStudentContext().
  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  if (studentContext.kind === 'none' && (await hasDashboardAccess(dbUser.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Single active student school when resolved; otherwise every school the
  // user is a member of at all (any status/role) — matches the 'none'
  // fallback used elsewhere in this endpoint (only reachable for a user with
  // zero real STUDENT memberships anywhere, so this naturally comes back
  // empty too).
  let schoolIds: string[]
  if (studentContext.kind === 'ok') {
    schoolIds = [studentContext.schoolId]
  } else {
    const schoolMembers = await prisma.schoolMember.findMany({
      where: { userId: dbUser.id },
      select: { schoolId: true },
    })
    if (schoolMembers.length === 0) return NextResponse.json({ plans: [] })
    schoolIds = [...new Set(schoolMembers.map(sm => sm.schoolId))]
  }

  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, name: true, slug: true, stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true },
  })
  const schoolMap = Object.fromEntries(schools.map(s => [s.id, {
    id: s.id, name: s.name, slug: s.slug,
    stripeEnabled: !!s.stripeSecretKey,
    revolutEnabled: !!(s.revolutSecretKey && s.revolutWebhookSecret),
  }]))

  const plans = await prisma.membershipPlan.findMany({
    where: { schoolId: { in: schoolIds }, isPublic: true, isActive: true },
    orderBy: [{ schoolId: 'asc' }, { sortOrder: 'asc' }, { price: 'asc' }],
    select: {
      id: true, name: true, description: true, price: true, currency: true,
      planType: true, billingCycle: true, validityDays: true,
      imageUrl: true, isPopular: true, classAccess: true, schoolId: true, paymentMethods: true,
    },
  })

  // Get user's active membership plan IDs to mark already-subscribed
  const activeMemberships = await prisma.membership.findMany({
    where: { userId: dbUser.id, status: 'ACTIVE' },
    select: { planId: true, schoolId: true },
  })
  const activePlanIds = new Set(activeMemberships.map(m => m.planId).filter(Boolean))
  const activeSchoolIds = new Set(activeMemberships.map(m => m.schoolId))

  // Plans with a request already sent and awaiting the school's approval —
  // lets the UI show "Pending" instead of letting the student request it again.
  const pendingMemberships = await prisma.membership.findMany({
    where: { userId: dbUser.id, status: 'PENDING' },
    select: { planId: true },
  })
  const pendingPlanIds = new Set(pendingMemberships.map(m => m.planId).filter(Boolean))

  return NextResponse.json({
    plans: plans.map(p => ({
      ...p,
      price: Number(p.price),
      school: schoolMap[p.schoolId] ?? { id: p.schoolId, name: '', slug: '' },
      alreadyActive: activePlanIds.has(p.id),
      pending: pendingPlanIds.has(p.id),
      hasActiveInSchool: activeSchoolIds.has(p.schoolId),
    })),
  })
}
