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
    try { await requireSchoolAccess(user.id, schoolId) }
    catch { return { error: 'Forbidden', status: 403 } }
  }
  return { schoolId }
}

function periodBounds(period: string) {
  const now = new Date()
  const points: { label: string; from: Date; to: Date }[] = []

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), from, to })
    }
  } else if (period === '30d') {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 3)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from, to })
    }
  } else if (period === '90d') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  }
  return { from: points[0]?.from ?? new Date(), points }
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const period   = searchParams.get('period')   ?? '30d'
  const filter   = searchParams.get('filter')   ?? 'ALL'
  const search   = searchParams.get('search')   ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 15
  const minCount = parseInt(searchParams.get('minCount') ?? '0') || 0
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo   = searchParams.get('dateTo')   ?? ''

  const { from: periodFrom, points } = periodBounds(period)
  const from = dateFrom ? new Date(dateFrom) : periodFrom

  // ── All cancelled bookings in period for this school ─────────────────────
  const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : undefined

  const allCancelled = await prisma.booking.findMany({
    where: {
      class: { schoolId: auth.schoolId },
      scheduledAt: { gte: from, ...(toDate ? { lte: toDate } : {}) },
      status: 'CANCELLED',
    },
    select: {
      id: true,
      userId: true,
      scheduledAt: true,
      user:  { select: { name: true, email: true, avatarUrl: true } },
      class: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  // ── Per-member aggregation ─────────────────────────────────────────────────
  type MemberAgg = {
    userId: string; name: string; email: string; avatarUrl: string | null
    count: number; mostMissedClass: string; lastMissedAt: string
  }
  const byUser = new Map<string, MemberAgg>()
  const classCountByUser = new Map<string, Map<string, number>>()

  for (const b of allCancelled) {
    const uid = b.userId
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        userId: uid,
        name:      b.user?.name     ?? '—',
        email:     b.user?.email    ?? '—',
        avatarUrl: b.user?.avatarUrl ?? null,
        count: 0,
        mostMissedClass: b.class?.name ?? '—',
        lastMissedAt: b.scheduledAt.toISOString(),
      })
      classCountByUser.set(uid, new Map())
    }
    const agg = byUser.get(uid)!
    agg.count++
    // track latest (already sorted desc so first seen is latest)
    if (b.scheduledAt > new Date(agg.lastMissedAt)) agg.lastMissedAt = b.scheduledAt.toISOString()
    const cc = classCountByUser.get(uid)!
    const cn = b.class?.name ?? '—'
    cc.set(cn, (cc.get(cn) ?? 0) + 1)
  }

  // resolve most-missed class per member
  for (const [uid, agg] of byUser) {
    const cc = classCountByUser.get(uid)
    if (cc) {
      let max = 0; let top = agg.mostMissedClass
      for (const [cn, cnt] of cc) { if (cnt > max) { max = cnt; top = cn } }
      agg.mostMissedClass = top
    }
  }

  // sorted by count desc
  let members = Array.from(byUser.values()).sort((a, b) => b.count - a.count)

  // apply search
  if (search) {
    const q = search.toLowerCase()
    members = members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  }

  // apply filters
  const atRiskThreshold = 3
  if (minCount > 0)            members = members.filter(m => m.count >= minCount)
  if (filter === 'AT_RISK')    members = members.filter(m => m.count >= atRiskThreshold)
  if (filter === 'OCCASIONAL') members = members.filter(m => m.count < atRiskThreshold)

  const total = members.length
  const paged = members.slice((page - 1) * pageSize, page * pageSize)

  // ── Stats ─────────────────────────────────────────────────────────────────
  const allMembers = Array.from(byUser.values())
  const totalAbsences   = allCancelled.length
  const uniqueMembers   = allMembers.length
  const atRiskCount     = allMembers.filter(m => m.count >= atRiskThreshold).length
  const avgCancellations = uniqueMembers > 0
    ? Math.round((allMembers.reduce((s, m) => s + m.count, 0) / uniqueMembers) * 10) / 10
    : 0

  // ── Trend chart (absences per time point) ────────────────────────────────
  const trendData = await Promise.all(
    points.map(async pt => {
      const count = await prisma.booking.count({
        where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: pt.from, lte: pt.to }, status: 'CANCELLED' },
      })
      return { date: pt.label, absences: count }
    })
  )

  // ── Day of week breakdown ─────────────────────────────────────────────────
  const dowMap: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
  for (const b of allCancelled) {
    const day = DOW[b.scheduledAt.getDay()]
    if (day) dowMap[day] = (dowMap[day] ?? 0) + 1
  }
  const dowData = DOW.map(d => ({ day: d, absences: dowMap[d] ?? 0 }))

  return NextResponse.json({
    stats: { totalAbsences, uniqueMembers, avgCancellations, atRiskCount },
    trendData,
    dowData,
    members: paged,
    total,
    page,
    pageSize,
    atRiskThreshold,
  })
}
