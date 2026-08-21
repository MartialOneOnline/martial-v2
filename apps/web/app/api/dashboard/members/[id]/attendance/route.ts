import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'

type DayStatus = 'present' | 'absent' | 'promoted' | 'not_marked'
const PRIORITY: Record<DayStatus, number> = { not_marked: 0, absent: 1, present: 2, promoted: 3 }

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

// GET /api/dashboard/members/[id]/attendance?year=2026 — day-by-day attendance for a school year
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.members.view')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const member = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    select: { userId: true, joinedAt: true },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const currentYear = new Date().getFullYear()
  const requestedYear = parseInt(req.nextUrl.searchParams.get('year') ?? '', 10)
  const year = Number.isFinite(requestedYear) ? requestedYear : currentYear
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1))

  const [bookings, gradings, earliestBooking, earliestGrading, lastGrading] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: member.userId, scheduledAt: { gte: yearStart, lt: yearEnd } },
      select: { scheduledAt: true, status: true, attendedAt: true },
    }),
    prisma.grading.findMany({
      where: { userId: member.userId, schoolId, gradedAt: { gte: yearStart, lt: yearEnd } },
      select: { gradedAt: true },
    }),
    prisma.booking.findFirst({
      where: { userId: member.userId },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    }),
    prisma.grading.findFirst({
      where: { userId: member.userId, schoolId },
      orderBy: { gradedAt: 'asc' },
      select: { gradedAt: true },
    }),
    prisma.grading.findFirst({
      where: { userId: member.userId, schoolId },
      orderBy: { gradedAt: 'desc' },
      select: { gradedAt: true },
    }),
  ])

  const days: Record<string, DayStatus> = {}
  const now = new Date()

  for (const b of bookings) {
    let status: DayStatus | null = null
    if (b.status === 'COMPLETED' || b.attendedAt) status = 'present'
    else if (b.status === 'NO_SHOW') status = 'absent'
    else if (['PENDING', 'CONFIRMED'].includes(b.status) && b.scheduledAt < now) status = 'not_marked'
    if (!status) continue
    const key = dateKey(b.scheduledAt)
    if (!days[key] || PRIORITY[status] > PRIORITY[days[key]!]) days[key] = status
  }

  for (const g of gradings) {
    days[dateKey(g.gradedAt)] = 'promoted'
  }

  const earliestYears = [earliestBooking?.scheduledAt, earliestGrading?.gradedAt, member.joinedAt]
    .filter((d): d is Date => !!d)
    .map(d => d.getFullYear())
  const minYear = earliestYears.length ? Math.min(...earliestYears) : currentYear
  const availableYears: number[] = []
  for (let y = minYear; y <= currentYear; y++) availableYears.push(y)

  return NextResponse.json({
    year,
    availableYears,
    lastGradingDate: lastGrading?.gradedAt.toISOString() ?? null,
    days,
  })
}
