import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// Read-only roster for a single class occurrence, visible to any student in
// the class's school (not just staff) — this is the "who's coming" list
// V1 showed on a class's Details screen. Deliberately returns only what's
// safe to show a fellow student (name, avatar, belt): no membership status,
// attendance marks, or booked-by info — those stay admin-only in
// /api/dashboard/classes/[id]/bookings.
export async function GET(req: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { classId } = await params
  const scheduledAtParam = req.nextUrl.searchParams.get('scheduledAt')
  const scheduledAt = scheduledAtParam ? new Date(scheduledAtParam) : null
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })
  }

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, schoolId: true } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const member = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: cls.schoolId, status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] } },
    select: { id: true },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const bookings = await prisma.booking.findMany({
    where: { classId, scheduledAt, status: { notIn: ['CANCELLED'] } },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          avatarUrl: true,
          schoolMembers: {
            where: { schoolId: cls.schoolId },
            select: { belt: true, beltDegree: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    attendees: bookings.map(b => {
      const m = b.user?.schoolMembers?.[0]
      return {
        id: b.id,
        name: b.user?.name ?? '—',
        avatarUrl: b.user?.avatarUrl ?? null,
        belt: m?.belt ?? null,
        beltDegree: m?.beltDegree ?? 0,
      }
    }),
  })
}
