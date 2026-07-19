import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, userId: true, scheduledAt: true, status: true },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.userId !== dbUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (booking.status === 'CANCELLED') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
  if (booking.scheduledAt <= new Date()) return NextResponse.json({ error: 'Cannot cancel past bookings' }, { status: 400 })

  await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } })

  return NextResponse.json({ success: true })
}
