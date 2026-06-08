import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '../../../lib/db'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schoolId } = await req.json()
  if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })

  // Get V2 user
  let dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: user.id } })
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: user.email!,
        supabaseAuthId: user.id,
        name: user.user_metadata?.full_name ?? null,
      },
    })
  }

  // Check not already a member
  const existing = await prisma.schoolMember.findFirst({
    where: { schoolId, userId: dbUser.id },
  })
  if (existing) {
    return NextResponse.json({ error: 'Already a member of this school' }, { status: 409 })
  }

  // Create trial membership
  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 7)

  await prisma.$transaction([
    prisma.schoolMember.create({
      data: {
        schoolId,
        userId: dbUser.id,
        role: 'STUDENT',
        status: 'ACTIVE',
        joinedAt: startDate,
        notes: 'Free trial — 1 week',
      },
    }),
    prisma.membership.create({
      data: {
        userId: dbUser.id,
        schoolId,
        planName: 'Free Trial — 1 Week',
        price: 0,
        currency: 'EUR',
        paymentMethod: 'CASH',
        status: 'ACTIVE',
        startDate,
        endDate,
      },
    }),
  ])

  return NextResponse.json({ success: true, trialEnds: endDate })
}
