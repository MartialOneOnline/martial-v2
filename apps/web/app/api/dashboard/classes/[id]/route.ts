import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/prisma-client/client'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { getSchoolPaymentCapabilities, sanitizePaymentMethods } from '@/lib/services/paymentCapabilities'

const CLASS_HAS_BOOKINGS_ERROR = 'Cannot delete a class with existing bookings. Deactivate it instead.'

async function authorise(permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, permission)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// PUT /api/dashboard/classes/[id] — update a class
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise('school.classes.update')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.class.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const {
    name, description, disciplineId, level, duration,
    capacity, price, currency, isTrial, isActive, isPublished, paymentMethods,
    bookingSettings, schedule, instructorId, coverUrl,
  } = body

  const { availableMethods } = await getSchoolPaymentCapabilities(auth.schoolId)

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
      paymentMethods: paymentMethods !== undefined ? sanitizePaymentMethods(paymentMethods, availableMethods) : existing.paymentMethods,
      bookingSettings: bookingSettings !== undefined ? bookingSettings : existing.bookingSettings,
      schedule: schedule !== undefined ? schedule : existing.schedule,
      instructorId: instructorId !== undefined ? (instructorId || null) : existing.instructorId,
      coverUrl: coverUrl !== undefined ? (coverUrl || null) : existing.coverUrl,
    },
    include: {
      instructor: { select: { id: true, name: true } },
      discipline: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(cls)
}

// DELETE /api/dashboard/classes/[id] — hard delete; blocked when the class
// still has bookings. Booking.classId is a required FK with no cascade (see
// prisma/schema.prisma) — Postgres RESTRICTs the delete, so any booking row
// blocks it regardless of status (a purely-CANCELLED history still trips
// the same FK, so this must count every row, not just active ones, or the
// pre-check below would wrongly predict success). Deactivate the class
// (isActive: false via PUT) is the supported alternative for a class with
// history.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise('school.classes.delete')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.class.findFirst({ where: { id, schoolId: auth.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bookingCount = await prisma.booking.count({ where: { classId: id } })
  if (bookingCount > 0) {
    return NextResponse.json({ error: CLASS_HAS_BOOKINGS_ERROR }, { status: 409 })
  }

  try {
    await prisma.class.delete({ where: { id } })
  } catch (err) {
    // Defense in depth: a booking created between the count check above and
    // this delete (e.g. a concurrent self-booking for this class) still
    // trips the same FK — surface the same clean 409 instead of an
    // unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return NextResponse.json({ error: CLASS_HAS_BOOKINGS_ERROR }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
