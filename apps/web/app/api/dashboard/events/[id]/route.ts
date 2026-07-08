import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getSchoolPaymentCapabilities, sanitizePaymentMethods } from '@/lib/services/paymentCapabilities'
import { slugify, uniqueSlug } from '@/lib/slug'

async function authorise(roles = ['OWNER', 'ADMIN']) {
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

const EVENT_INCLUDE = {
  instructor: { select: { id: true, name: true } },
  tickets: {
    orderBy: { sortOrder: 'asc' as const },
    include: { _count: { select: { bookings: { where: { status: 'CONFIRMED' as const } } } } },
  },
}

// PUT /api/dashboard/events/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.event.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const {
    title, description, type, location, startAt, endAt,
    capacity, paymentMethods, isPublished, isCancelled, externalUrl, instructorId, coverUrl,
    tickets,
  } = body as {
    title?: string; description?: string; type?: string; location?: string; startAt?: string; endAt?: string
    capacity?: number; paymentMethods?: string[]; isPublished?: boolean; isCancelled?: boolean
    externalUrl?: string; instructorId?: string; coverUrl?: string
    tickets?: { id?: string; name: string; description?: string; price?: number; currency?: string; capacity?: number }[]
  }

  // Slug is assigned once and kept stable across edits (shared links must
  // keep working) — only backfill it for older events that predate this field.
  const slug = existing.slug ?? await uniqueSlug(slugify((title ?? existing.title).trim()), async candidate =>
    (await prisma.event.count({ where: { schoolId: auth.schoolId, slug: candidate, id: { not: id } } })) > 0
  )

  // Reconcile tickets by id instead of delete-everything-and-recreate: a ticket that
  // already has bookings must keep its id (and those bookings' ticketId FK) across edits,
  // otherwise it becomes permanently stuck while a fresh duplicate gets created next to it.
  const ticketWrite = !Array.isArray(tickets) ? undefined : await (async () => {
    const existingTickets = await prisma.eventTicket.findMany({
      where: { eventId: id },
      select: { id: true, _count: { select: { bookings: true } } },
    })
    const existingIds = new Set(existingTickets.map(t => t.id))
    const incomingIds = new Set(tickets.filter(t => t.id).map(t => t.id!))

    // Removed from the form — only safe to hard-delete if it never had any booking
    // (FK restrict on EventBooking.ticketId blocks deleting one that does).
    const toDelete = existingTickets
      .filter(t => !incomingIds.has(t.id) && t._count.bookings === 0)
      .map(t => t.id)

    const toTicketData = (t: (typeof tickets)[number]) => ({
      name: t.name.trim(),
      description: t.description?.trim() || null,
      price: t.price !== undefined ? Number(t.price) : 0,
      currency: t.currency || 'EUR',
      // `!= null` (not truthy) — 0 is a valid capacity ("sold out"/"no seats"), distinct from unset (null = unlimited).
      capacity: t.capacity != null ? Number(t.capacity) : null,
    })

    return {
      deleteMany: { id: { in: toDelete } },
      update: tickets
        .filter(t => t.id && existingIds.has(t.id))
        .map(t => ({ where: { id: t.id! }, data: { ...toTicketData(t), sortOrder: tickets.indexOf(t) } })),
      create: tickets
        .filter(t => !t.id || !existingIds.has(t.id))
        .map(t => ({ ...toTicketData(t), sortOrder: tickets.indexOf(t) })),
    }
  })()

  const { availableMethods } = await getSchoolPaymentCapabilities(auth.schoolId)

  const event = await prisma.event.update({
    where: { id },
    data: {
      title:          title?.trim()              ?? existing.title,
      slug,
      description:    description !== undefined  ? (description?.trim() || null) : existing.description,
      type:           (type as typeof existing.type) ?? existing.type,
      location:       location !== undefined      ? (location?.trim() || null) : existing.location,
      startAt:        startAt                     ? new Date(startAt) : existing.startAt,
      endAt:          endAt !== undefined         ? (endAt ? new Date(endAt) : null) : existing.endAt,
      capacity:       capacity !== undefined      ? (capacity != null ? Number(capacity) : null) : existing.capacity,
      paymentMethods: paymentMethods !== undefined ? sanitizePaymentMethods(paymentMethods, availableMethods) : existing.paymentMethods,
      isPublished:    isPublished                 ?? existing.isPublished,
      isCancelled:    isCancelled                 ?? existing.isCancelled,
      externalUrl:    externalUrl !== undefined   ? (externalUrl?.trim() || null) : existing.externalUrl,
      instructorId:   instructorId !== undefined  ? (instructorId || null) : existing.instructorId,
      coverUrl:       coverUrl !== undefined       ? (coverUrl || null) : existing.coverUrl,
      ...(ticketWrite && { tickets: ticketWrite }),
    },
    include: EVENT_INCLUDE,
  })

  return NextResponse.json(event)
}

// DELETE /api/dashboard/events/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.event.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.event.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
