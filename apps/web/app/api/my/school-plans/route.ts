import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

// GET /api/my/school-plans — public membership plans for the student's school(s)
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get schools where user is a member (any status)
  const schoolMembers = await prisma.schoolMember.findMany({
    where: { userId: dbUser.id },
    select: { schoolId: true },
  })

  if (schoolMembers.length === 0) return NextResponse.json({ plans: [] })

  const schoolIds = [...new Set(schoolMembers.map(sm => sm.schoolId))]

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

  return NextResponse.json({
    plans: plans.map(p => ({
      ...p,
      price: Number(p.price),
      school: schoolMap[p.schoolId] ?? { id: p.schoolId, name: '', slug: '' },
      alreadyActive: activePlanIds.has(p.id),
      hasActiveInSchool: activeSchoolIds.has(p.schoolId),
    })),
  })
}
