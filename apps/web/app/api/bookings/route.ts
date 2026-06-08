import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '../../lib/db'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { classId, scheduledAt } = await req.json()
  if (!classId || !scheduledAt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: user.id } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const booking = await prisma.booking.create({
    data: {
      userId: dbUser.id,
      classId,
      scheduledAt: new Date(scheduledAt),
      status: 'CONFIRMED',
      paymentMethod: 'CASH',
      amountPaid: 0,
      currency: 'EUR',
    },
  })

  return NextResponse.json({ success: true, bookingId: booking.id })
}
