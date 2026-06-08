import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const q = searchParams.get('q')
  const discipline = searchParams.get('discipline')

  const schools = await prisma.school.findMany({
    where: {
      AND: [
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
    include: {
      disciplines: { include: { discipline: true } },
      instructors: { where: { isHead: true }, take: 1 },
    },
    orderBy: { googleRating: 'desc' },
  })

  return NextResponse.json(schools)
}
