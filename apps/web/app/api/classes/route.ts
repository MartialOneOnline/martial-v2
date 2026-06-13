import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city       = searchParams.get('city')
  const q          = searchParams.get('q')
  const discipline = searchParams.get('discipline')

  const classes = await prisma.class.findMany({
    where: {
      isActive: true,
      isPublished: true,
      school: {
        AND: [
          { status: { not: 'SUSPENDED' } },
          city ? { city: { contains: city, mode: 'insensitive' } } : {},
          discipline
            ? {
                disciplines: {
                  some: {
                    discipline: {
                      name: { contains: discipline, mode: 'insensitive' },
                    },
                  },
                },
              }
            : {},
        ],
      },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { school: { name: { contains: q, mode: 'insensitive' } } },
              { school: { city: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      school: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          country: true,
          coverUrl: true,
          hasFreeTrialCls: true,
          googleRating: true,
          membershipPlans: {
            where: { isActive: true },
            orderBy: [{ isPopular: 'desc' }, { price: 'asc' }],
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              billingCycle: true,
              isPopular: true,
            },
          },
        },
      },
      instructor: {
        select: { name: true, belt: true, role: true },
      },
    },
    orderBy: [{ school: { googleRating: 'desc' } }, { name: 'asc' }],
  })

  return NextResponse.json(classes)
}
