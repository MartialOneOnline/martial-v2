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
  const status      = searchParams.get('status')      // PAID|PENDING|FAILED|REFUNDED|FLAGGED|ALL
  const method      = searchParams.get('method')      // STRIPE|CASH|BANK_TRANSFER|DIRECT_DEBIT|OTHER|ALL
  const type        = searchParams.get('type')        // INCOME|EXPENSE|ALL
  const search      = searchParams.get('search')      || ''
  const membership  = searchParams.get('membership')  || '' // filter by description (plan name)
  const belt        = searchParams.get('belt')        || '' // filter by member's belt
  const dateFrom    = searchParams.get('dateFrom')    || '' // ISO date string
  const dateTo      = searchParams.get('dateTo')      || '' // ISO date string
  const page        = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize    = Math.min(100, parseInt(searchParams.get('pageSize') || '20'))
  // Only meaningful within status=FLAGGED (every other status always has
  // resolvedAt=null) — 'false' (default when omitted) hides resolved cases
  // from the "Needs review" tab, 'true' shows only resolved ones (a small
  // audit view), 'all' shows both. Keeps the tab's default view = actually
  // pending work, per the dashboard's own "Needs review" framing.
  const resolved    = searchParams.get('resolved')    // 'true'|'false'|'all'|null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(status     && status !== 'ALL'  ? { status }                          : {}),
    ...(status === 'FLAGGED' && resolved !== 'all'
      ? { resolvedAt: resolved === 'true' ? { not: null } : null }
      : {}),
    ...(method     && method !== 'ALL'  ? { paymentMethod: method }           : {}),
    ...(type       && type   !== 'ALL'  ? { type }                            : {}),
    ...(membership ? { description: { contains: membership, mode: 'insensitive' } } : {}),
    ...(belt ? { user: { schoolMembers: { some: { schoolId: auth.schoolId, belt } } } } : {}),
    ...(dateFrom || dateTo ? {
      date: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
      },
    } : {}),
    ...(search ? {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [transactions, total, stats, unresolvedFlaggedCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        resolvedByUser: { select: { name: true, email: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.transaction.groupBy({
      by: ['status'],
      where: { schoolId: auth.schoolId, ...(type && type !== 'ALL' ? { type: type as any } : {}) } as any,
      _count: { id: true },
      _sum: { amount: true },
    }) as any,
    // FLAGGED's own tab count must reflect *pending* review, not every row
    // ever flagged — resolved ones shouldn't inflate the "needs attention"
    // badge. Can't get this split from the groupBy above (it only groups by
    // status, not resolvedAt), so it's a dedicated count.
    prisma.transaction.count({ where: { schoolId: auth.schoolId, status: 'FLAGGED', resolvedAt: null } }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statMap = Object.fromEntries((stats as any[]).map((s: any) => [s.status, { count: s._count?.id ?? 0, sum: s._sum?.amount ?? 0 }]))
  const totalRevenue = statMap['PAID']?.sum ?? 0
  const countByStatus = {
    PAID:     statMap['PAID']?.count     ?? 0,
    PENDING:  statMap['PENDING']?.count  ?? 0,
    FAILED:   statMap['FAILED']?.count   ?? 0,
    REFUNDED: statMap['REFUNDED']?.count ?? 0,
    // Payments the provider already captured but that were deliberately not
    // turned into active access (e.g. ARCHIVED member) — never part of
    // totalRevenue, surfaced separately so admins can find them. Unresolved
    // only — see unresolvedFlaggedCount above.
    FLAGGED:  unresolvedFlaggedCount,
  }

  return NextResponse.json({
    transactions: transactions.map(t => ({
      id: t.id,
      userName:    t.user?.name ?? '—',
      userEmail:   t.user?.email ?? null,
      userAvatar:  t.user?.avatarUrl ?? null,
      description:   (t.description && t.description !== 'NULL') ? t.description : null,
      method:        t.paymentMethod ?? null,
      category:      t.category,
      amount:      Number(t.amount),
      currency:    t.currency,
      date:        t.date.toISOString(),
      status:      t.status,
      type:        t.type,
      notes:       t.notes ?? null,
      // Booking reference (Booking or EventBooking id — plain string, no FK)
      // — set for class/event transactions, including FLAGGED ones so an
      // admin can trace the exact event booking under review.
      bookingId:   t.bookingId ?? null,
      // Provider payment reference — mainly relevant for online (Stripe/Revolut)
      // transactions, especially FLAGGED ones an admin needs to trace back to
      // the provider's own dashboard to decide on a refund.
      stripePaymentIntentId: t.stripePaymentIntentId ?? null,
      revolutOrderId:        t.revolutOrderId ?? null,
      // Manual-review resolution (FLAGGED only) — see PATCH .../[id] action=resolve.
      resolvedAt:      t.resolvedAt ? t.resolvedAt.toISOString() : null,
      resolvedByName:  t.resolvedByUser?.name ?? t.resolvedByUser?.email ?? null,
      resolutionNote:  t.resolutionNote ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      periodStart: (t as any).periodStart ? new Date((t as any).periodStart).toISOString() : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      periodEnd:   (t as any).periodEnd   ? new Date((t as any).periodEnd).toISOString()   : null,
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
  const { userId, description, amount, currency, date, status, type, category, notes, paymentMethod } = body

  if (!amount || !date || !type) {
    return NextResponse.json({ error: 'amount, date and type are required' }, { status: 400 })
  }

  const tx = await prisma.transaction.create({
    data: {
      schoolId:      auth.schoolId,
      userId:        userId ?? null,
      description:   description?.trim() || null,
      amount:        parseFloat(amount),
      currency:      currency ?? 'EUR',
      date:          new Date(date),
      status:        status ?? 'PAID',
      type:          type ?? 'INCOME',
      category:      category ?? 'MEMBERSHIP',
      notes:         notes?.trim() || null,
      paymentMethod: paymentMethod ?? null,
    },
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(tx, { status: 201 })
}
