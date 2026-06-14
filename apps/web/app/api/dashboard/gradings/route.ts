import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// GET /api/dashboard/gradings
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const belt   = searchParams.get('belt')   // White|Blue|Purple|Brown|Black
  const search = searchParams.get('search') || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, parseInt(searchParams.get('pageSize') || '50'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(belt && belt !== 'All' ? { toBelt: { contains: belt, mode: 'insensitive' } } : {}),
    ...(search ? {
      user: { name: { contains: search, mode: 'insensitive' } },
    } : {}),
  }

  const [gradings, total] = await Promise.all([
    prisma.grading.findMany({
      where,
      include: {
        user:        { select: { name: true, avatarUrl: true } },
        promotedBy:  { select: { name: true } },
      },
      orderBy: { gradedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.grading.count({ where }),
  ])

  // Belt distribution from SchoolMember
  const beltGroups = await prisma.schoolMember.groupBy({
    by: ['belt'],
    where: { schoolId: auth.schoolId, belt: { not: null } },
    _count: { id: true },
  })
  const beltDistribution = beltGroups
    .filter(b => b.belt)
    .map(b => ({ belt: b.belt!, count: b._count.id }))

  // Promotions by transition
  const allGradings = await prisma.grading.findMany({
    where: { schoolId: auth.schoolId, fromBelt: { not: null } },
    select: { fromBelt: true, toBelt: true },
  })
  const transitionMap = new Map<string, number>()
  for (const g of allGradings) {
    const key = `${g.fromBelt}→${g.toBelt}`
    transitionMap.set(key, (transitionMap.get(key) ?? 0) + 1)
  }
  const promotionsByTransition = Array.from(transitionMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    gradings: gradings.map(g => ({
      id:          g.id,
      userName:    g.user?.name    ?? '—',
      userAvatar:  g.user?.avatarUrl ?? null,
      fromBelt:    g.fromBelt ?? null,
      toBelt:      g.toBelt,
      toDegree:    g.toDegree ?? 0,
      gradedAt:    g.gradedAt.toISOString(),
      instructor:  g.promotedBy?.name ?? null,
      notes:       g.notes ?? null,
    })),
    total,
    page,
    pageSize,
    beltDistribution,
    promotionsByTransition,
  })
}
