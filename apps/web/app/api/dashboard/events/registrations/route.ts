import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import type { Prisma } from '@/lib/prisma-client/client'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// GET /api/dashboard/events/registrations — every EventBooking across all of the
// school's events, unlike /api/dashboard/events/[id]/bookings which is scoped to one.
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const eventId  = searchParams.get('eventId')  || ''
  const status   = searchParams.get('status')   || '' // PENDING|CONFIRMED|CANCELLED|COMPLETED|NO_SHOW|ALL
  const search   = searchParams.get('search')   || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'))

  const where: Prisma.EventBookingWhereInput = {
    event: { schoolId: auth.schoolId },
    ...(eventId ? { eventId } : {}),
    ...(status && status !== 'ALL' ? { status: status as Prisma.EventBookingWhereInput['status'] } : {}),
    ...(search ? {
      OR: [
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [registrations, total, statusCounts] = await Promise.all([
    prisma.eventBooking.findMany({
      where,
      select: {
        id: true, ticketName: true, quantity: true, status: true, paymentMethod: true,
        amountPaid: true, currency: true, createdAt: true, checkedIn: true, checkedInAt: true,
        eventId: true,
        event: { select: { title: true, startAt: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.eventBooking.count({ where }),
    prisma.eventBooking.groupBy({
      by: ['status'],
      where: { event: { schoolId: auth.schoolId }, ...(eventId ? { eventId } : {}) },
      _count: { id: true },
    }),
  ])

  const countMap = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]))
  const countByStatus = {
    PENDING:   countMap['PENDING']   ?? 0,
    CONFIRMED: countMap['CONFIRMED'] ?? 0,
    CANCELLED: countMap['CANCELLED'] ?? 0,
    COMPLETED: countMap['COMPLETED'] ?? 0,
    NO_SHOW:   countMap['NO_SHOW']   ?? 0,
  }

  return NextResponse.json({
    registrations: registrations.map(r => ({
      id: r.id,
      userName:  r.user.name ?? '—',
      userEmail: r.user.email,
      userPhone: r.user.phone,
      eventId:   r.eventId,
      eventTitle: r.event.title,
      eventStartAt: r.event.startAt.toISOString(),
      ticketName: r.ticketName,
      quantity:   r.quantity,
      status:     r.status,
      paymentMethod: r.paymentMethod,
      amountPaid: r.amountPaid !== null ? Number(r.amountPaid) : null,
      currency:   r.currency,
      createdAt:  r.createdAt.toISOString(),
      checkedIn:  r.checkedIn,
      checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    })),
    total,
    page,
    pageSize,
    countByStatus,
  })
}
