import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// DELETE /api/my/events/bookings/[id] — student self-cancels their own event
// ticket. Only PENDING bookings (a cash "pay at the door" reservation, or an
// online payment that hasn't confirmed yet) qualify — nothing has been
// charged for those, so cancelling is a plain status flip, mirroring
// DELETE /api/my/bookings/[id] for classes. A CONFIRMED ticket has already
// been paid online and there's no refund integration here, so self-cancelling
// it would look like a refund without being one — that stays a "Contact
// organizer" conversation instead (see ContactOrganizerSheet in
// app/my/events/page.tsx).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const booking = await prisma.eventBooking.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, event: { select: { startAt: true } } },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.userId !== dbUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status !== 'PENDING')
    return NextResponse.json({ error: 'Only a pending ticket can be self-cancelled — contact the organizer for a confirmed one' }, { status: 400 })
  if (booking.event.startAt <= new Date())
    return NextResponse.json({ error: 'Cannot cancel a ticket for a past event' }, { status: 400 })

  await prisma.eventBooking.update({ where: { id }, data: { status: 'CANCELLED' } })

  return NextResponse.json({ success: true })
}
