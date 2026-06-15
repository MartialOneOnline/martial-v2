import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function auth() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(m.role)) return { error: 'Forbidden', status: 403 as const }
    } catch { return { error: 'Forbidden', status: 403 as const } }
  }
  return { schoolId }
}

async function verifySystem(systemId: string, schoolId: string) {
  return prisma.gradingSystem.findFirst({ where: { id: systemId, schoolId } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const sys = await verifySystem(id, a.schoolId)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const maxRank = await prisma.beltRank.findFirst({
    where: { systemId: id },
    orderBy: { order: 'desc' },
  })
  const order = body.order ?? (maxRank ? maxRank.order + 1 : 0)

  const rank = await prisma.beltRank.create({
    data: {
      systemId:             id,
      order,
      name:                 body.name,
      color:                body.color ?? '#9CA3AF',
      maxDegrees:           body.maxDegrees ?? 0,
      minAge:               body.minAge ?? null,
      minMonthsAtPrevious:  body.minMonthsAtPrevious ?? null,
      totalClassesRequired: body.totalClassesRequired ?? null,
      classesPerPeriod:     body.classesPerPeriod ?? null,
      periodType:           body.periodType ?? null,
      classTypeIds:         body.classTypeIds ?? [],
    },
  })

  return NextResponse.json({ rank }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const sys = await verifySystem(id, a.schoolId)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { order }: { order: string[] } = await req.json()
  await Promise.all(order.map((rankId, idx) =>
    prisma.beltRank.updateMany({ where: { id: rankId, systemId: id }, data: { order: idx } })
  ))

  const ranks = await prisma.beltRank.findMany({ where: { systemId: id }, orderBy: { order: 'asc' } })
  return NextResponse.json({ ranks })
}
