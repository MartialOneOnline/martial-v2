import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/public/schools/[slug]/info — public school metadata for join page
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    select: {
      name: true, city: true, logoUrl: true, tagline: true, status: true,
      disciplines: { include: { discipline: { select: { name: true } } } },
    },
  })

  // ARCHIVED/SUSPENDED schools must not be reachable by direct slug.
  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status))
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    school: {
      name:        school.name,
      city:        school.city,
      logoUrl:     school.logoUrl,
      tagline:     school.tagline,
      disciplines: school.disciplines.map(d => d.discipline.name),
    },
  })
}
