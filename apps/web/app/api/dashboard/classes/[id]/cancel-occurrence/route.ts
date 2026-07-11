import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { notifyClassCancelled } from '@/lib/notifications/create'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params
  const body = await req.json().catch(() => ({}))
  const dateParam: string | undefined = body.date

  const base = dateParam ? new Date(dateParam) : new Date()
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  // Find the bookings this cancellation will actually affect *before*
  // writing, so we know which students to notify — updateMany() alone only
  // returns a count, not the rows. Same where clause the write below uses,
  // so "affected" here means exactly the rows that get cancelled.
  const affected = await prisma.booking.findMany({
    where: {
      classId,
      class: { schoolId },
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      status: { notIn: ['CANCELLED'] },
    },
    select: { id: true, user: { select: { name: true, email: true } } },
  })

  if (affected.length === 0) {
    // Nothing to cancel — also covers calling this twice for the same
    // class/date: the first call already moved every row to CANCELLED, so a
    // second call finds none matching status: { notIn: ['CANCELLED'] } and
    // stops here, creating zero notifications.
    return NextResponse.json({ cancelled: 0 })
  }

  await prisma.booking.updateMany({
    where: { id: { in: affected.map(b => b.id) } },
    data: { status: 'CANCELLED' },
  })

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { name: true } })
  const className = cls?.name ?? 'la clase'
  const dateLabel = startOfDay.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  for (const booking of affected) {
    const studentName = booking.user?.name ?? booking.user?.email ?? 'Un alumno'
    notifyClassCancelled(schoolId, studentName, className, dateLabel, classId)
  }

  return NextResponse.json({ cancelled: affected.length })
}
