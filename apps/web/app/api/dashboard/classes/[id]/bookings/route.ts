import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params
  const body = await req.json().catch(() => ({}))
  const { userId, date } = body as { userId?: string; date?: string }
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Verify class belongs to school
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const base = date ? new Date(date) : new Date()
  const scheduledAt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0)

  // Avoid duplicate active bookings
  const existing = await prisma.booking.findFirst({
    where: {
      classId,
      userId,
      scheduledAt: {
        gte: new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate()),
        lt:  new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate() + 1),
      },
      status: { notIn: ['CANCELLED'] },
    },
  })
  if (existing) return NextResponse.json({ error: 'Already booked' }, { status: 409 })

  const booking = await prisma.booking.create({
    data: { classId, userId, scheduledAt, status: 'CONFIRMED' },
    include: { user: { select: { name: true, avatarUrl: true } } },
  })

  return NextResponse.json({
    booking: {
      id:        booking.id,
      name:      booking.user?.name ?? '—',
      avatarUrl: booking.user?.avatarUrl ?? null,
      status:    booking.status,
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params

  // Optional ?date=YYYY-MM-DD param; defaults to today (server timezone)
  const dateParam = req.nextUrl.searchParams.get('date')
  const base = dateParam ? new Date(dateParam) : new Date()
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  const bookings = await prisma.booking.findMany({
    where: {
      classId,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      class: { schoolId },
    },
    include: {
      user: {
        select: {
          name: true,
          avatarUrl: true,
          schoolMembers: {
            where: { schoolId },
            select: { belt: true, beltDegree: true, status: true },
            take: 1,
          },
          memberships: {
            where: { schoolId, status: { in: ['ACTIVE', 'PENDING'] } },
            orderBy: { createdAt: 'desc' },
            select: { status: true, planName: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    bookings: bookings.map(b => {
      const member     = b.user?.schoolMembers?.[0]
      const membership = b.user?.memberships?.[0]
      return {
        id:               b.id,
        name:             b.user?.name ?? '—',
        avatarUrl:        b.user?.avatarUrl ?? null,
        status:           b.status,
        attendedAt:       b.attendedAt?.toISOString() ?? null,
        scheduledAt:      b.scheduledAt.toISOString(),
        belt:             member?.belt ?? null,
        beltDegree:       member?.beltDegree ?? 0,
        memberStatus:     member?.status ?? null,
        membershipStatus: membership?.status ?? null,
        membershipPlan:   membership?.planName ?? null,
      }
    }),
  })
}
