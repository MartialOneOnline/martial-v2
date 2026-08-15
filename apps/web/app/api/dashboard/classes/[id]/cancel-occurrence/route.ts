import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { notifyClassCancelled } from '@/lib/notifications/create'
import { sendClassCancelledEmail } from '@/lib/email/sendEmails'

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
  const reason: string | undefined = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || undefined : undefined
  const hidden: boolean = body.hidden === true

  const dateKey = dateParam ?? new Date().toISOString().slice(0, 10)
  // Canonical UTC-midnight key for the ClassCancellation row — independent
  // of server timezone, unlike the local startOfDay/endOfDay window below
  // (which only scopes the Booking query and matches how scheduledAt was
  // already being matched here before this occurrence-level record existed).
  const occurrenceDate = new Date(`${dateKey}T00:00:00.000Z`)

  const base = dateParam ? new Date(dateParam) : new Date()
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { name: true, school: { select: { name: true, city: true, language: true } } },
  })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Persist the cancellation at the occurrence level regardless of whether
  // anyone is booked — this is what makes "Cancel Class" stick (survives
  // popup remounts, blocks new bookings for this date) instead of only
  // cancelling whatever bookings happened to exist at click time.
  await prisma.classCancellation.upsert({
    where: { classId_date: { classId, date: occurrenceDate } },
    create: { classId, date: occurrenceDate, reason, hidden },
    update: { reason, hidden },
  })

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
    select: { id: true, scheduledAt: true, user: { select: { name: true, email: true } } },
  })

  if (affected.length === 0) {
    return NextResponse.json({ cancelled: 0 })
  }

  await prisma.booking.updateMany({
    where: { id: { in: affected.map(b => b.id) } },
    data: { status: 'CANCELLED' },
  })

  const className = cls.name
  const dateLabel = startOfDay.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  for (const booking of affected) {
    const studentName = booking.user?.name ?? booking.user?.email ?? 'Un alumno'
    notifyClassCancelled(schoolId, studentName, className, dateLabel, classId)

    if (booking.user?.email) {
      sendClassCancelledEmail({
        to: booking.user.email,
        studentName: booking.user.name,
        schoolName: cls.school.name,
        schoolCity: cls.school.city,
        className,
        scheduledAt: booking.scheduledAt,
        reason,
        lang: cls.school.language,
      }).catch(err => console.error('[cancel-occurrence] student email failed:', err))
    }
  }

  return NextResponse.json({ cancelled: affected.length })
}
