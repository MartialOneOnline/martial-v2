import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.gradings.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// PATCH /api/dashboard/gradings/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const grading = await prisma.grading.findFirst({
    where: { id, schoolId: auth.schoolId },
  })
  if (!grading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Optional FK enrichment — validate ranks belong to this school before trusting them.
  if (body.fromBeltRankId || body.toBeltRankId) {
    const ranks = await prisma.beltRank.findMany({
      where: {
        id: { in: [body.toBeltRankId, body.fromBeltRankId].filter(Boolean) },
        system: { schoolId: auth.schoolId },
      },
      select: { id: true },
    })
    const validIds = new Set(ranks.map(r => r.id))
    if (body.toBeltRankId && !validIds.has(body.toBeltRankId)) {
      return NextResponse.json({ error: 'Invalid toBeltRankId for this school' }, { status: 400 })
    }
    if (body.fromBeltRankId && !validIds.has(body.fromBeltRankId)) {
      return NextResponse.json({ error: 'Invalid fromBeltRankId for this school' }, { status: 400 })
    }
  }

  const updated = await prisma.grading.update({
    where: { id },
    data: {
      ...(body.fromBelt       !== undefined && { fromBelt:       body.fromBelt ?? null }),
      ...(body.fromBeltRankId !== undefined && { fromBeltRankId: body.fromBeltRankId ?? null }),
      ...(body.toBelt         !== undefined && { toBelt:         body.toBelt }),
      ...(body.toBeltRankId   !== undefined && { toBeltRankId:   body.toBeltRankId ?? null }),
      ...(body.toDegree       !== undefined && { toDegree:       body.toDegree }),
      ...(body.gradedAt       !== undefined && { gradedAt:       new Date(body.gradedAt) }),
      ...(body.notes          !== undefined && { notes:          body.notes ?? null }),
    },
    include: {
      user:      { select: { name: true, avatarUrl: true } },
      promotedBy:{ select: { name: true } },
    },
  })

  return NextResponse.json({
    id:             updated.id,
    userName:       updated.user.name,
    userAvatar:     updated.user.avatarUrl,
    fromBelt:       updated.fromBelt,
    fromBeltRankId: updated.fromBeltRankId,
    toBelt:         updated.toBelt,
    toBeltRankId:   updated.toBeltRankId,
    toDegree:       updated.toDegree ?? 0,
    gradedAt:       updated.gradedAt.toISOString(),
    instructor:     updated.promotedBy?.name ?? null,
    notes:          updated.notes,
  })
}

// DELETE /api/dashboard/gradings/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const grading = await prisma.grading.findFirst({
    where: { id, schoolId: auth.schoolId },
  })
  if (!grading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.grading.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
