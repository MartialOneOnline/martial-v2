import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBookedCounts } from '@/lib/services/eventCapacity'

// Public, unauthenticated feed of upcoming published events across all schools,
// for the Explore "Events" tab. Unlike /api/my/events (membership-scoped, requires auth),
// this returns events regardless of which school hosts them.
export async function GET() {
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
      isCancelled: false,
      startAt: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      location: true,
      startAt: true,
      endAt: true,
      capacity: true,
      coverUrl: true,
      paymentMethods: true,
      school: { select: { name: true, slug: true, logoUrl: true, city: true, country: true } },
      instructor: { select: { name: true, photoUrl: true } },
      tickets: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, description: true, price: true, currency: true, capacity: true },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  const { byTicket, byEvent } = await getBookedCounts(events.map(e => e.id))

  const result = events.map(e => ({
    ...e,
    booked: byEvent.get(e.id) ?? 0,
    tickets: e.tickets.map(t => ({ ...t, booked: byTicket.get(t.id) ?? 0 })),
  }))

  return NextResponse.json({ events: result })
}
