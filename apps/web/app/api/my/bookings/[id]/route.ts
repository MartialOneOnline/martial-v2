import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
