import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: {
      id: true, name: true, email: true, phone: true,
      avatarUrl: true, dateOfBirth: true, role: true,
      memberships: {
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
        take: 3,
        select: {
          id: true, planName: true, price: true, currency: true,
          status: true, startDate: true, endDate: true,
          classesUsed: true, paymentMethod: true,
          school: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
        },
      },
      bookings: {
        where: { scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true, scheduledAt: true, status: true,
          class: {
            select: {
              id: true, name: true, duration: true,
              school: { select: { name: true, slug: true } },
            },
          },
        },
      },
      schoolMembers: {
        where: { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] } },
        select: {
          id: true, belt: true, beltDegree: true, beltDate: true, role: true, status: true,
          school: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      },
      gradings: {
        orderBy: { gradedAt: 'desc' },
        take: 10,
        select: {
          id: true, fromBelt: true, toBelt: true,
          toDegree: true, gradedAt: true, notes: true,
          school: { select: { name: true } },
          promotedBy: { select: { name: true } },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, dateOfBirth } = body

  const updated = await prisma.user.update({
    where: { supabaseAuthId: authUser.id },
    data: {
      ...(name !== undefined && { name: name || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
    },
    select: { id: true, name: true, phone: true, dateOfBirth: true },
  })

  return NextResponse.json({ user: updated })
}
