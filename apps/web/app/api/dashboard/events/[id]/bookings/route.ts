import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

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
      amountPaid: true, currency: true, createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ bookings })
}
