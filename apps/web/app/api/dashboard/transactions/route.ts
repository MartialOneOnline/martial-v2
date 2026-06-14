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

// GET /api/dashboard/transactions
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')   // PAID|PENDING|FAILED|REFUNDED|ALL
  const search   = searchParams.get('search')   || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(status && status !== 'ALL' ? { status: status as 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' } : {}),
    ...(search ? {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [transactions, total, stats] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ['status'],
      where: { schoolId: auth.schoolId },
      _count: { id: true },
      _sum: { amount: true },
    }),
  ])

  const statMap = Object.fromEntries(stats.map(s => [s.status, { count: s._count.id, sum: s._sum.amount ?? 0 }]))
  const totalRevenue = statMap['PAID']?.sum ?? 0
  const countByStatus = {
    PAID:     statMap['PAID']?.count     ?? 0,
    PENDING:  statMap['PENDING']?.count  ?? 0,
    FAILED:   statMap['FAILED']?.count   ?? 0,
    REFUNDED: statMap['REFUNDED']?.count ?? 0,
  }

  return NextResponse.json({
    transactions: transactions.map(t => ({
      id: t.id,
      userName:    t.user?.name ?? '—',
      userEmail:   t.user?.email ?? null,
      userAvatar:  t.user?.avatarUrl ?? null,
      description:   (t.description && t.description !== 'NULL') ? t.description : null,
      method:        t.paymentMethod ?? t.category,
      amount:      Number(t.amount),
      currency:    t.currency,
      date:        t.date.toISOString(),
      status:      t.status,
      type:        t.type,
      notes:       t.notes ?? null,
    })),
    total,
    page,
    pageSize,
    totalRevenue,
    countByStatus,
  })
}

// POST /api/dashboard/transactions
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { userId, description, amount, currency, date, status, type, category, notes } = body

  if (!amount || !date || !type) {
    return NextResponse.json({ error: 'amount, date and type are required' }, { status: 400 })
  }

  const tx = await prisma.transaction.create({
    data: {
      schoolId:    auth.schoolId,
      userId:      userId ?? null,
      description: description?.trim() || null,
      amount:      parseFloat(amount),
      currency:    currency ?? 'EUR',
      date:        new Date(date),
      status:      status ?? 'PAID',
      type:        type ?? 'INCOME',
      category:    category ?? 'MEMBERSHIP',
      notes:       notes?.trim() || null,
    },
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(tx, { status: 201 })
}
