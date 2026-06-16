import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { canMarkAttended } from '@/lib/services/attendance'

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

// PATCH /api/dashboard/bookings/[id]/attend
// Marks a booking as attended: sets attendedAt = now, status = COMPLETED.
// Idempotent: already-COMPLETED bookings return 200 without re-writing.
// CANCELLED bookings cannot be marked attended.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where: { id, class: { schoolId: auth.schoolId } },
    select: { id: true, status: true, attendedAt: true },
  })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const guard = canMarkAttended(booking.status as Parameters<typeof canMarkAttended>[0], booking.attendedAt)
  if (!guard.ok) {
    return NextResponse.json({ error: guard.reason }, { status: guard.httpStatus })
  }
  if (guard.alreadyDone) {
    return NextResponse.json({
      id:         booking.id,
      status:     booking.status,
      attendedAt: booking.attendedAt,
    })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { attendedAt: new Date(), status: 'COMPLETED' },
    select: { id: true, status: true, attendedAt: true },
  })

  return NextResponse.json({
    id:         updated.id,
    status:     updated.status,
    attendedAt: updated.attendedAt,
  })
}
