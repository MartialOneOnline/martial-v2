import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { checkAndExpireMembership } from '@/lib/services/membership'

// GET /api/my/memberships — full membership list for the logged-in student
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
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'desc' },
    include: {
      school: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
      plan: {
        select: {
          name: true, planType: true, billingCycle: true,
          validityDays: true, imageUrl: true, classAccess: true,
        },
      },
    },
  })

  // Lazily expire any memberships that were cancelled via UNTIL_END_OF_PERIOD policy
  // and whose endDate has now passed. Runs in parallel — failures are silent so the
  // page still loads even if one expiry check errors.
  await Promise.allSettled(
    memberships
      .filter(m => m.cancelledAt && m.endDate && m.status === 'ACTIVE')
      .map(m => checkAndExpireMembership(m.id))
  )

  // Re-fetch after expiry so status is accurate in the response
  const freshMemberships = memberships.some(m => m.cancelledAt && m.endDate && m.status === 'ACTIVE')
    ? await prisma.membership.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'desc' },
        include: {
          school: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
          plan: {
            select: {
              name: true, planType: true, billingCycle: true,
              validityDays: true, imageUrl: true, classAccess: true,
            },
          },
        },
      })
    : memberships

  // Count bookings consumed per membership
  const membershipIds = freshMemberships.map(m => m.id)
  const usageCounts = await prisma.booking.groupBy({
    by: ['membershipId'],
    where: { membershipId: { in: membershipIds }, status: { not: 'CANCELLED' } },
    _count: { id: true },
  })
  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))

  return NextResponse.json({
    memberships: freshMemberships.map(m => {
      const classAccess = m.plan?.classAccess as { globalLimit?: string; globalLimitType?: string } | null
      const totalAllowed =
        classAccess?.globalLimitType === 'TOTAL' && classAccess?.globalLimit
          ? parseInt(classAccess.globalLimit, 10) || null
          : null

      return {
        id: m.id,
        planName: m.plan?.name ?? m.planName,
        planType: m.plan?.planType ?? 'SUBSCRIPTION',
        billingCycle: m.plan?.billingCycle ?? null,
        validityDays: m.plan?.validityDays ?? null,
        imageUrl: m.plan?.imageUrl ?? null,
        classAccess: m.plan?.classAccess ?? {},
        price: Number(m.price),
        currency: m.currency,
        paymentMethod: m.paymentMethod,
        status: m.status,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate?.toISOString() ?? null,
        cancelledAt: m.cancelledAt?.toISOString() ?? null,
        consumed: usageMap[m.id] ?? 0,
        totalAllowed,
        notes: m.notes,
        school: m.school,
        stripeSubId: m.stripeSubId ?? null,
      }
    }),
  })
}
