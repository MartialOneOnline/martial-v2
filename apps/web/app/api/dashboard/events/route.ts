import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getBookedCounts } from '@/lib/services/eventCapacity'
import { getSchoolPaymentCapabilities, sanitizePaymentMethods } from '@/lib/services/paymentCapabilities'

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

const EVENT_INCLUDE = {
  instructor: { select: { id: true, name: true } },
  tickets: { orderBy: { sortOrder: 'asc' as const } },
}

// GET /api/dashboard/events
export async function GET() {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [events, instructors, paymentCapabilities] = await Promise.all([
    prisma.event.findMany({
      where: { schoolId: auth.schoolId },
      include: EVENT_INCLUDE,
      orderBy: { startAt: 'asc' },
    }),
    prisma.instructor.findMany({
      where: { schoolId: auth.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getSchoolPaymentCapabilities(auth.schoolId),
  ])

  // "Booked" must match the PENDING+CONFIRMED, quantity-summed definition used
  // everywhere capacity is enforced (checkEventCapacity) — otherwise pending
  // registrations silently vanish from the dashboard's headcount.
  const { byTicket } = await getBookedCounts(events.map(e => e.id))
  const eventsWithCounts = events.map(ev => ({
    ...ev,
    tickets: ev.tickets.map(t => ({ ...t, bookedCount: byTicket.get(t.id) ?? 0 })),
  }))

  return NextResponse.json({ events: eventsWithCounts, instructors, paymentCapabilities })
}

// POST /api/dashboard/events
export async function POST(req: NextRequest) {
  const auth = await authorise(['OWNER', 'ADMIN'])
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const {
    title, description, type, location, startAt, endAt,
    capacity, paymentMethods, isPublished, externalUrl, instructorId, coverUrl,
    tickets = [],
  } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!startAt)       return NextResponse.json({ error: 'Start date is required' }, { status: 400 })

  const { availableMethods } = await getSchoolPaymentCapabilities(auth.schoolId)

  const event = await prisma.event.create({
    data: {
      schoolId: auth.schoolId,
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'OTHER',
      location: location?.trim() || null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      // `!= null` (not truthy) — 0 is a valid capacity ("sold out"/"no seats"), distinct from unset (null = unlimited).
      capacity: capacity != null ? Number(capacity) : null,
      paymentMethods: sanitizePaymentMethods(paymentMethods, availableMethods),
      isPublished: isPublished ?? false,
      externalUrl: externalUrl?.trim() || null,
      instructorId: instructorId || null,
      coverUrl: coverUrl || null,
      tickets: {
        create: tickets.map((t: { name: string; description?: string; price?: number; currency?: string; capacity?: number }, i: number) => ({
          name: t.name.trim(),
          description: t.description?.trim() || null,
          price: t.price !== undefined ? Number(t.price) : 0,
          currency: t.currency || 'EUR',
          capacity: t.capacity != null ? Number(t.capacity) : null,
          sortOrder: i,
        })),
      },
    },
    include: EVENT_INCLUDE,
  })

  return NextResponse.json(event, { status: 201 })
}
