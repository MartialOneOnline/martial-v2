import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { sendEventTicketConfirmationEmail } from '@/lib/email/sendEmails'

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

// PATCH /api/dashboard/events/[id]/bookings/[bookingId] — mark a cash reservation
// as paid (CONFIRMED) or release the spot (CANCELLED).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, bookingId } = await params
  const { status } = await req.json() as { status: 'CONFIRMED' | 'CANCELLED' }
  if (!['CONFIRMED', 'CANCELLED'].includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const event = await prisma.event.findFirst({
    where: { id, schoolId: auth.schoolId },
    select: { title: true, startAt: true, location: true, school: { select: { name: true, city: true, language: true } } },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const booking = await prisma.eventBooking.findFirst({
    where: { id: bookingId, eventId: id },
    select: { status: true, ticketName: true, quantity: true, amountPaid: true, currency: true, user: { select: { email: true, name: true } } },
  })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const updated = await prisma.eventBooking.update({
    where: { id: bookingId },
    data: { status },
  })

  if (status === 'CONFIRMED' && booking.status !== 'CONFIRMED' && booking.user?.email) {
    sendEventTicketConfirmationEmail({
      to:          booking.user.email,
      studentName: booking.user.name,
      schoolName:  event.school.name,
      schoolCity:  event.school.city,
      eventTitle:  event.title,
      ticketName:  booking.ticketName,
      quantity:    booking.quantity,
      amount:      Number(booking.amountPaid ?? 0),
      currency:    booking.currency,
      startAt:     event.startAt,
      location:    event.location,
      bookingId,
      lang:        event.school.language,
    }).catch(err => console.error('[admin] cash confirmation email failed:', err))
  }

  return NextResponse.json(updated)
}
