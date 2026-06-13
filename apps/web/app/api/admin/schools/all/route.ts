import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const country = searchParams.get('country') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (country) where.country = country

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, slug: true, status: true, source: true,
        city: true, country: true, email: true, phone: true,
        createdAt: true, updatedAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.school.count({ where }),
  ])

  const countries = await prisma.school.findMany({
    where: { country: { not: null } },
    select: { country: true },
    distinct: ['country'],
    orderBy: { country: 'asc' },
  })

  return NextResponse.json({
    schools,
    total,
    pages: Math.ceil(total / limit),
    countries: countries.map(c => c.country).filter(Boolean),
  })
}
