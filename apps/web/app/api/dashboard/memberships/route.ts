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

// GET /api/dashboard/memberships
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')   // ACTIVE|CANCELLED|EXPIRED|PAUSED|ALL
  const search   = searchParams.get('search')   || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(status && status !== 'ALL' ? { status } : {}),
    ...(search ? {
      OR: [
        { planName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [memberships, total, stats] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: { user: { select: { name: true, email: true, avatarUrl: true } } },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.membership.count({ where }),
    prisma.membership.groupBy({
      by: ['status'],
      where: { schoolId: auth.schoolId },
      _count: { id: true },
      _sum: { price: true },
    }),
  ])

  const statMap = Object.fromEntries(stats.map(s => [s.status, { count: s._count.id, sum: s._sum.price ?? 0 }]))
  const totalRevenue = statMap['ACTIVE']?.sum ?? 0

  return NextResponse.json({
    memberships: memberships.map(m => ({
      id:            m.id,
      userName:      m.user?.name  ?? '—',
      userEmail:     m.user?.email ?? null,
      userAvatar:    m.user?.avatarUrl ?? null,
      planName:      m.planName,
      paymentMethod: m.paymentMethod,
      price:         m.price,
      currency:      m.currency,
      status:        m.status,
      startDate:     m.startDate.toISOString(),
      endDate:       m.endDate?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
    totalRevenue: Math.round(totalRevenue),
    countByStatus: {
      ACTIVE:    statMap['ACTIVE']?.count    ?? 0,
      CANCELLED: statMap['CANCELLED']?.count ?? 0,
      EXPIRED:   statMap['EXPIRED']?.count   ?? 0,
      PAUSED:    statMap['PAUSED']?.count    ?? 0,
    },
  })
}
