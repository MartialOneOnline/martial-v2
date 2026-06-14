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

// GET /api/dashboard/balance
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const type    = searchParams.get('type')   // INCOME|EXPENSE|ALL
  const search  = searchParams.get('search') || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(type && type !== 'ALL' ? { type } : {}),
    ...(search ? {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { category:    { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  // Monthly chart data for last 12 months
  const allTx = await prisma.transaction.findMany({
    where: { schoolId: auth.schoolId },
    select: { type: true, amount: true, date: true },
  })

  const monthMap = new Map<string, { income: number; expenses: number }>()
  for (const tx of allTx) {
    const key = tx.date.toISOString().slice(0, 7) // YYYY-MM
    const cur = monthMap.get(key) ?? { income: 0, expenses: 0 }
    if (tx.type === 'INCOME')  cur.income   += Number(tx.amount)
    else                       cur.expenses += Number(tx.amount)
    monthMap.set(key, cur)
  }
  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      date: new Date(key + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }),
      income: Math.round(v.income),
      expenses: Math.round(v.expenses),
    }))

  const totalIncome   = allTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = allTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  return NextResponse.json({
    entries: entries.map(t => ({
      id:          t.id,
      date:        t.date.toISOString(),
      description: (t.description && t.description !== 'NULL') ? t.description : null,
      category:    t.category,
      type:        t.type,
      amount:      Number(t.amount),
      currency:    t.currency,
      status:      t.status,
    })),
    total,
    page,
    pageSize,
    totalIncome:   Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
    netBalance:    Math.round(totalIncome - totalExpenses),
    chartData,
  })
}
