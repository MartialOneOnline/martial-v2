import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise(roles = ['OWNER', 'ADMIN', 'INSTRUCTOR']) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!roles.includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// POST /api/dashboard/events/[id]/checkin
// Body: { qrToken, action?: 'accept' }
// Scans an attendee's ticket QR for this event.
// - CANCELLED booking            -> error
// - already checked in            -> alreadyCheckedIn: true (idempotent)
// - CONFIRMED booking             -> checked in immediately
// - PENDING booking, no action    -> needsConfirmation: true (staff decides at the door)
// - PENDING booking, action=accept -> checked in (staff accepted the pending ticket)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const event = await prisma.event.findFirst({ where: { id, schoolId: auth.schoolId }, select: { id: true } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { qrToken, action } = body as { qrToken?: string; action?: 'accept' }
  if (!qrToken) return NextResponse.json({ error: 'qrToken is required' }, { status: 400 })

  const booking = await prisma.eventBooking.findFirst({
    where: { qrToken, eventId: id },
    select: {
      id: true, status: true, checkedIn: true, ticketName: true, quantity: true,
      amountPaid: true, currency: true, paymentMethod: true,
      user: { select: { name: true, email: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const studentName = booking.user.name ?? booking.user.email

  if (booking.status === 'CANCELLED')
    return NextResponse.json({ error: `${studentName}'s booking was cancelled` }, { status: 400 })

  if (booking.checkedIn)
    return NextResponse.json({ ok: true, alreadyCheckedIn: true, studentName, ticketName: booking.ticketName })

  if (booking.status === 'PENDING' && action !== 'accept') {
    return NextResponse.json({
      ok: true,
      needsConfirmation: true,
      studentName,
      ticketName: booking.ticketName,
      quantity: booking.quantity,
      amountPaid: booking.amountPaid,
      currency: booking.currency,
      paymentMethod: booking.paymentMethod,
    })
  }

  await prisma.eventBooking.update({
    where: { id: booking.id },
    data: { checkedIn: true, checkedInAt: new Date() },
  })

  return NextResponse.json({ ok: true, studentName, ticketName: booking.ticketName })
}
