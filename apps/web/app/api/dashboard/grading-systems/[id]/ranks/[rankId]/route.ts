import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function auth() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(m.role, 'school.gradings.manage')) return { error: 'Forbidden', status: 403 as const }
    } catch { return { error: 'Forbidden', status: 403 as const } }
  }
  return { schoolId }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; rankId: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id, rankId } = await params
  const rank = await prisma.beltRank.findFirst({
    where: { id: rankId, systemId: id, system: { schoolId: a.schoolId } },
  })
  if (!rank) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.beltRank.update({
    where: { id: rankId },
    data: {
      ...(body.name !== undefined                && { name: body.name }),
      ...(body.color !== undefined               && { color: body.color }),
      ...(body.maxDegrees !== undefined          && { maxDegrees: body.maxDegrees }),
      ...(body.minAge !== undefined              && { minAge: body.minAge }),
      ...(body.minMonthsAtPrevious !== undefined && { minMonthsAtPrevious: body.minMonthsAtPrevious }),
      ...(body.totalClassesRequired !== undefined && { totalClassesRequired: body.totalClassesRequired }),
      ...(body.classesPerPeriod !== undefined    && { classesPerPeriod: body.classesPerPeriod }),
      ...(body.periodType !== undefined          && { periodType: body.periodType }),
      ...(body.classTypeIds !== undefined        && { classTypeIds: body.classTypeIds }),
      ...(body.requireCompetition !== undefined  && { requireCompetition: body.requireCompetition }),
      ...(body.requireExam !== undefined         && { requireExam: body.requireExam }),
    },
  })

  return NextResponse.json({ rank: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rankId: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id, rankId } = await params
  const rank = await prisma.beltRank.findFirst({
    where: { id: rankId, systemId: id, system: { schoolId: a.schoolId } },
  })
  if (!rank) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.beltRank.delete({ where: { id: rankId } })
  return NextResponse.json({ ok: true })
}
