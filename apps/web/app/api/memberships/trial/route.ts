import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { notifyNewLead } from '@/lib/notifications/create'
import { normalizePhone } from '@/lib/phone'

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

  // Validate school exists and offers free trials
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, hasFreeTrialCls: true, status: true },
  })
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })
  if (school.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'School is not available' }, { status: 403 })
  }
  if (!school.hasFreeTrialCls) {
    return NextResponse.json({ error: 'This school does not offer free trials' }, { status: 403 })
  }

  // Get or create V2 user
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

  // Block repeat trials — any previous membership at this school (including expired/cancelled) counts
  const previousMembership = await prisma.membership.findFirst({
    where: { schoolId, userId: dbUser.id },
    select: { id: true },
  })
  if (previousMembership) {
    return NextResponse.json(
      { error: 'You have already used a trial at this school' },
      { status: 409 },
    )
  }

  // Same check by phone, across other accounts — email alone can't be reused
  // (User.email is unique), but nothing stops someone from signing up with a
  // second email and the same phone number to re-trial. Phone numbers are
  // stored as free-typed text ("+34 600 000 000" vs "600000000" vs
  // "0034 600 000 000" are all the same number), so this can't be a DB-level
  // string match — fetch this school's members with a phone on file and
  // compare normalized values in JS.
  if (dbUser.phone) {
    const normalizedTarget = normalizePhone(dbUser.phone)
    const otherMembers = await prisma.membership.findMany({
      where: { schoolId, userId: { not: dbUser.id }, user: { phone: { not: null } } },
      select: { user: { select: { phone: true } } },
    })
    const phoneReuse = otherMembers.some(m => m.user.phone && normalizePhone(m.user.phone) === normalizedTarget)
    if (phoneReuse) {
      return NextResponse.json(
        { error: 'A trial has already been used with this phone number at this school' },
        { status: 409 },
      )
    }
  }

  // Race-condition protection: use a transaction
  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 7)

  try {
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
  } catch (err: unknown) {
    // Unique constraint violation — duplicate concurrent request
    const code = (err as { code?: string }).code
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already used a trial at this school' },
        { status: 409 },
      )
    }
    throw err
  }

  notifyNewLead(schoolId, dbUser.name ?? dbUser.email)

  return NextResponse.json({ success: true, trialEnds: endDate })
}
