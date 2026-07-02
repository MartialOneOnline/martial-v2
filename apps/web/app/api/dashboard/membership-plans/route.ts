import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise(roles = ['OWNER', 'ADMIN']) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!roles.includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// GET /api/dashboard/membership-plans — list plans + classes for current school
export async function GET() {
  const auth = await authorise(['OWNER', 'ADMIN', 'INSTRUCTOR'])
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [plans, classes, memberships, school] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { schoolId: auth.schoolId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.class.findMany({
      where: { schoolId: auth.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    // Count active members per plan
    prisma.membership.groupBy({
      by: ['planId'],
      where: { schoolId: auth.schoolId, status: 'ACTIVE', planId: { not: null } },
      _count: { id: true },
    }),
    prisma.school.findUnique({ where: { id: auth.schoolId }, select: { slug: true } }),
  ])

  const memberCountByPlan = Object.fromEntries(
    memberships.map(m => [m.planId, m._count.id])
  )

  return NextResponse.json({
    plans: plans.map(p => ({ ...p, memberCount: memberCountByPlan[p.id] ?? 0 })),
    classes,
    schoolSlug: school?.slug ?? null,
  })
}

// POST /api/dashboard/membership-plans — create a plan
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const {
    name, description, price, currency, planType, billingCycle,
    validityDays, isPublic, isPopular, isActive, sortOrder,
    classAccess, stripePriceId, imageUrl, paymentMethods,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const plan = await prisma.membershipPlan.create({
    data: {
      schoolId: auth.schoolId,
      name: name.trim(),
      description: description?.trim() || null,
      price: price !== undefined && price !== '' ? Number(price) : 0,
      currency: currency || 'EUR',
      planType: planType || 'SUBSCRIPTION',
      billingCycle: billingCycle || 'monthly',
      validityDays: validityDays ? Number(validityDays) : null,
      isPublic: isPublic ?? true,
      isPopular: isPopular ?? false,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
      classAccess: classAccess ?? {},
      stripePriceId: stripePriceId?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : ['CASH'],
    },
  })

  return NextResponse.json(plan, { status: 201 })
}
