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

// PUT /api/dashboard/classes/[id] — update a class
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.class.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const {
    name, description, disciplineId, level, duration,
    capacity, price, currency, isTrial, isActive, isPublished, paymentMethods,
    bookingSettings, schedule, instructorId,
  } = body

  const cls = await prisma.class.update({
    where: { id },
    data: {
      name: name?.trim() ?? existing.name,
      description: description?.trim() ?? existing.description,
      disciplineId: disciplineId !== undefined ? (disciplineId || null) : existing.disciplineId,
      level: level !== undefined ? (level || null) : existing.level,
      duration: duration !== undefined ? (duration ? Number(duration) : null) : existing.duration,
      capacity: capacity !== undefined ? (capacity ? Number(capacity) : null) : existing.capacity,
      price: price !== undefined ? (price !== '' ? Number(price) : null) : existing.price,
      currency: currency ?? existing.currency,
      isTrial: isTrial ?? existing.isTrial,
      isActive: isActive ?? existing.isActive,
      isPublished: isPublished ?? existing.isPublished,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : existing.paymentMethods,
      bookingSettings: bookingSettings !== undefined ? bookingSettings : existing.bookingSettings,
      schedule: schedule !== undefined ? schedule : existing.schedule,
      instructorId: instructorId !== undefined ? (instructorId || null) : existing.instructorId,
    },
    include: {
      instructor: { select: { id: true, name: true } },
      discipline: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(cls)
}

// DELETE /api/dashboard/classes/[id] — soft delete (deactivate) or hard delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.class.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.class.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
