import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

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
  tickets: { orderBy: { sortOrder: 'asc' as const } },
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
  } = body

  const event = await prisma.event.update({
    where: { id },
    data: {
      title:          title?.trim()              ?? existing.title,
      description:    description !== undefined  ? (description?.trim() || null) : existing.description,
      type:           type                        ?? existing.type,
      location:       location !== undefined      ? (location?.trim() || null) : existing.location,
      startAt:        startAt                     ? new Date(startAt) : existing.startAt,
      endAt:          endAt !== undefined         ? (endAt ? new Date(endAt) : null) : existing.endAt,
      capacity:       capacity !== undefined      ? (capacity ? Number(capacity) : null) : existing.capacity,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : existing.paymentMethods,
      isPublished:    isPublished                 ?? existing.isPublished,
      isCancelled:    isCancelled                 ?? existing.isCancelled,
      externalUrl:    externalUrl !== undefined   ? (externalUrl?.trim() || null) : existing.externalUrl,
      instructorId:   instructorId !== undefined  ? (instructorId || null) : existing.instructorId,
      coverUrl:       coverUrl !== undefined       ? (coverUrl || null) : existing.coverUrl,
      // Replace all tickets if provided
      ...(Array.isArray(tickets) && {
        tickets: {
          deleteMany: {},
          create: tickets.map((t: { name: string; description?: string; price?: number; currency?: string; capacity?: number }, i: number) => ({
            name: t.name.trim(),
            description: t.description?.trim() || null,
            price: t.price !== undefined ? Number(t.price) : 0,
            currency: t.currency || 'EUR',
            capacity: t.capacity ? Number(t.capacity) : null,
            sortOrder: i,
          })),
        },
      }),
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
