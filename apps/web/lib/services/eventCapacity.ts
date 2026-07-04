import type { Prisma } from '@/lib/prisma-client/client'

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const

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
