import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// GET /api/dashboard/classes/enrollments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns { "classId|YYYY-MM-DD": count } for all non-cancelled bookings in range.
// Also accepts ?date=YYYY-MM-DD as shorthand for a single day (returns { classId: count }).
// Used by Calendar/Timetable chips to show per-session enrollment counts.
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const sp = req.nextUrl.searchParams
  const singleDate = sp.get('date')
  const startParam = sp.get('startDate') ?? singleDate
  const endParam   = sp.get('endDate')   ?? singleDate

  const baseStart = startParam ? new Date(startParam + 'T12:00:00') : new Date()
  const baseEnd   = endParam   ? new Date(endParam   + 'T12:00:00') : baseStart

  const rangeStart = new Date(baseStart.getFullYear(), baseStart.getMonth(), baseStart.getDate())
  const rangeEnd   = new Date(baseEnd.getFullYear(),   baseEnd.getMonth(),   baseEnd.getDate() + 1)

  const bookings = await prisma.booking.findMany({
    where: {
      class: { schoolId },
      scheduledAt: { gte: rangeStart, lt: rangeEnd },
      status: { notIn: ['CANCELLED'] },
    },
    select: { classId: true, scheduledAt: true },
  })

  // Build map: "classId|YYYY-MM-DD" → count
  const result: Record<string, number> = {}
  for (const b of bookings) {
    const d = b.scheduledAt
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const key = `${b.classId}|${dateStr}`
    result[key] = (result[key] ?? 0) + 1
  }

  return NextResponse.json(result)
}
