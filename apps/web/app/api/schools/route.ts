import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const q = searchParams.get('q')
  const discipline = searchParams.get('discipline')

  const schools = await prisma.school.findMany({
    where: {
      AND: [
        { status: { notIn: ['SUSPENDED', 'ARCHIVED'] } },
        city ? { city: { contains: city, mode: 'insensitive' } } : {},
        q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        } : {},
        discipline ? {
          disciplines: {
            some: {
              discipline: { slug: { contains: discipline, mode: 'insensitive' } },
            },
          },
        } : {},
      ],
    },
    // Public, unauthenticated endpoint (homepage + /explore) — select only
    // publicly-safe fields. Never widen this to `include`/no-select, since
    // School also holds plaintext Stripe/Revolut secret keys.
    select: {
      id: true, slug: true, name: true, city: true, country: true, address: true,
      lat: true, lng: true, coverUrl: true, coverPosY: true, logoUrl: true,
      googleRating: true, googleReviews: true, description: true, tagline: true,
      priceFrom: true, hasFreeTrialCls: true, facilities: true, type: true,
      disciplines: { select: { discipline: { select: { name: true, slug: true } } } },
      instructors: {
        where: { isHead: true },
        take: 1,
        select: { name: true, belt: true, isHead: true },
      },
      events: {
        where: { isPublished: true, isCancelled: false, startAt: { gte: new Date() } },
        take: 1,
        select: { id: true },
      },
      // Real signal for "has something to join" — priceFrom is a free-typed
      // display field on School and isn't derived from actual plans, so it
      // can't be trusted to gate product logic (see /join CTA below).
      membershipPlans: {
        where: { isActive: true, isPublic: true },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { googleRating: 'desc' },
  })

  const result = schools.map(({ events, membershipPlans, ...school }) => ({
    ...school,
    hasUpcomingEvent: events.length > 0,
    hasPublicPlans: membershipPlans.length > 0,
  }))

  return NextResponse.json(result)
}
