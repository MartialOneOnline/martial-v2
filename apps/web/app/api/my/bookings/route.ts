import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.id }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const past = searchParams.get('past') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const now = new Date()
  const where = {
    userId: dbUser.id,
    scheduledAt: past ? { lt: now } : { gte: now },
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: past ? 'desc' : 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, scheduledAt: true, status: true, attendedAt: true, amountPaid: true, currency: true,
        class: {
          select: {
            id: true, name: true, duration: true, level: true,
            school: { select: { name: true, slug: true, logoUrl: true } },
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ])

  return NextResponse.json({ bookings, total, pages: Math.ceil(total / limit) })
}
