import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { canUnmarkAttendance } from '@/lib/services/attendance'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) {
        return { error: 'Forbidden', status: 403 as const }
      }
    } catch {
      return { error: 'Forbidden', status: 403 as const }
    }
  }
  return { schoolId }
}

// PATCH /api/dashboard/bookings/[id]/unmark
// Reverts a COMPLETED or NO_SHOW booking back to CONFIRMED, clearing attendedAt.
// Lets staff undo an attendance mark made by mistake.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where: { id, class: { schoolId: auth.schoolId } },
    select: { id: true, status: true },
  })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const guard = canUnmarkAttendance(booking.status as Parameters<typeof canUnmarkAttendance>[0])
  if (!guard.ok) {
    return NextResponse.json({ error: guard.reason }, { status: guard.httpStatus })
  }
  if (guard.alreadyDone) {
    return NextResponse.json({
      id:         booking.id,
      status:     booking.status,
      attendedAt: null,
    })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { attendedAt: null, status: 'CONFIRMED' },
    select: { id: true, status: true, attendedAt: true },
  })

  return NextResponse.json({
    id:         updated.id,
    status:     updated.status,
    attendedAt: updated.attendedAt,
  })
}
