import type { Prisma } from '@/lib/prisma-client/client'
import { prisma } from '@/lib/db'

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const

// Read-only booked-quantity totals per ticket and per event, for display (e.g. "3 left" / "Sold out").
// Shared by the public events feed and the school profile page so the groupBy pattern isn't duplicated.
export async function getBookedCounts(eventIds: string[]) {
  if (eventIds.length === 0) return { byTicket: new Map<string, number>(), byEvent: new Map<string, number>() }

  const [byTicketRows, byEventRows] = await Promise.all([
    prisma.eventBooking.groupBy({
      by: ['ticketId'],
      where: { eventId: { in: eventIds }, status: { in: [...ACTIVE_STATUSES] } },
      _sum: { quantity: true },
    }),
    prisma.eventBooking.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds }, status: { in: [...ACTIVE_STATUSES] } },
      _sum: { quantity: true },
    }),
  ])

  return {
    byTicket: new Map(byTicketRows.map(r => [r.ticketId, r._sum.quantity ?? 0])),
    byEvent: new Map(byEventRows.map(r => [r.eventId, r._sum.quantity ?? 0])),
  }
}

// Checks whether `quantity` more seats fit within the ticket's and event's capacity.
// Must be called inside a $transaction alongside the EventBooking create/update
// so the check and the write happen atomically.
export async function checkEventCapacity(
  tx: Prisma.TransactionClient,
  params: { eventId: string; ticketId: string; ticketCapacity: number | null; eventCapacity: number | null; quantity: number; excludeBookingId?: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { eventId, ticketId, ticketCapacity, eventCapacity, quantity, excludeBookingId } = params

  if (ticketCapacity !== null) {
    const { _sum } = await tx.eventBooking.aggregate({
      where: { ticketId, status: { in: [...ACTIVE_STATUSES] }, ...(excludeBookingId && { id: { not: excludeBookingId } }) },
      _sum: { quantity: true },
    })
    if ((_sum.quantity ?? 0) + quantity > ticketCapacity) {
      return { ok: false, reason: 'Ticket is sold out' }
    }
  }

  if (eventCapacity !== null) {
    const { _sum } = await tx.eventBooking.aggregate({
      where: { eventId, status: { in: [...ACTIVE_STATUSES] }, ...(excludeBookingId && { id: { not: excludeBookingId } }) },
      _sum: { quantity: true },
    })
    if ((_sum.quantity ?? 0) + quantity > eventCapacity) {
      return { ok: false, reason: 'Event is full' }
    }
  }

  return { ok: true }
}
