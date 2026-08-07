import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { checkEventCapacity } from '@/lib/services/eventCapacity'
import { recordOnlinePayment } from '@/lib/services/transactions'
import { sendEventTicketConfirmationEmail } from '@/lib/email/sendEmails'
import { PaymentMethod, TransactionCategory } from '@/lib/prisma-client/enums'

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

// GET /api/dashboard/events/[id]/bookings — list registrants for an event
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const event = await prisma.event.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bookings = await prisma.eventBooking.findMany({
    where: { eventId: id },
    select: {
      id: true, ticketName: true, quantity: true, status: true, paymentMethod: true,
      amountPaid: true, currency: true, createdAt: true, checkedIn: true, checkedInAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ bookings })
}

// POST /api/dashboard/events/[id]/bookings — staff manually registers someone,
// either an existing school member (userId) or a new attendee (email/name).
// Status can be CONFIRMED (already paid — records a ledger transaction right
// away) or PENDING (awaiting payment — same as a self-service cash booking;
// staff confirm it later from the table with "Mark as paid").
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const {
    userId, email, name, ticketId, quantity: rawQuantity, paymentMethod: rawMethod, status: rawStatus, notes,
  } = body as {
    userId?: string; email?: string; name?: string; ticketId?: string
    quantity?: number; paymentMethod?: string; status?: string; notes?: string
  }

  const trimmedEmail = email?.trim().toLowerCase()
  if (!userId && !trimmedEmail) return NextResponse.json({ error: 'Select a member or enter an email' }, { status: 400 })
  if (!ticketId) return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
  const quantity = Math.min(10, Math.max(1, Math.round(rawQuantity ?? 1)))
  const paymentMethod = (Object.values(PaymentMethod).includes(rawMethod as PaymentMethod) ? rawMethod : 'CASH') as PaymentMethod
  const status = rawStatus === 'PENDING' ? 'PENDING' : 'CONFIRMED'

  const event = await prisma.event.findFirst({
    where: { id, schoolId: auth.schoolId },
    select: { id: true, schoolId: true, capacity: true, title: true, startAt: true, location: true, school: { select: { name: true, city: true, language: true } } },
  })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const ticket = await prisma.eventTicket.findFirst({
    where: { id: ticketId, eventId: id },
    select: { id: true, name: true, price: true, currency: true, capacity: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const attendee = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    : await prisma.user.upsert({
        where: { email: trimmedEmail! },
        update: name?.trim() ? { name: name.trim() } : {},
        create: { email: trimmedEmail!, name: name?.trim() || null, role: 'STUDENT' },
        select: { id: true, email: true, name: true },
      })
  if (!attendee) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const booking = await prisma.$transaction(async (tx) => {
    const capacity = await checkEventCapacity(tx, {
      eventId: id, ticketId, ticketCapacity: ticket.capacity, eventCapacity: event.capacity, quantity,
    })
    if (!capacity.ok) throw Object.assign(new Error(capacity.reason), { status: 409 })

    const created = await tx.eventBooking.create({
      data: {
        eventId: id,
        ticketId,
        userId: attendee.id,
        ticketName: ticket.name,
        quantity,
        status,
        amountPaid: ticket.price * quantity,
        currency: ticket.currency,
        paymentMethod,
        qrToken: crypto.randomUUID(),
      },
    })

    if (status === 'CONFIRMED') {
      await recordOnlinePayment(tx, {
        schoolId:      event.schoolId,
        userId:        attendee.id,
        amount:        ticket.price * quantity,
        currency:      ticket.currency,
        paymentMethod,
        category:      TransactionCategory.OTHER, // no dedicated EVENT category yet
        description:   `${event.title} — ${ticket.name} x${quantity}${notes?.trim() ? ` (${notes.trim()})` : ''}`,
        bookingId:     created.id,
      })
    }

    return created
  }).catch((err: Error & { status?: number }) => {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  })

  if (booking instanceof NextResponse) return booking

  if (status === 'CONFIRMED' && attendee.email) {
    sendEventTicketConfirmationEmail({
      to:          attendee.email,
      studentName: attendee.name,
      schoolName:  event.school.name,
      schoolCity:  event.school.city,
      eventTitle:  event.title,
      ticketName:  ticket.name,
      quantity,
      amount:      ticket.price * quantity,
      currency:    ticket.currency,
      startAt:     event.startAt,
      location:    event.location,
      bookingId:   booking.id,
      qrToken:     booking.qrToken,
      lang:        event.school.language,
    }).catch(err => console.error('[admin] manual registration confirmation email failed:', err))
  }

  return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 })
}
