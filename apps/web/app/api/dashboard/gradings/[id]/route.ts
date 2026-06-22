import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role)) return { error: 'Forbidden', status: 403 }
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
  const updated = await prisma.grading.update({
    where: { id },
    data: {
      ...(body.fromBelt  !== undefined && { fromBelt:  body.fromBelt ?? null }),
      ...(body.toBelt    !== undefined && { toBelt:    body.toBelt }),
      ...(body.toDegree  !== undefined && { toDegree:  body.toDegree }),
      ...(body.gradedAt  !== undefined && { gradedAt:  new Date(body.gradedAt) }),
      ...(body.notes     !== undefined && { notes:     body.notes ?? null }),
    },
    include: {
      user:      { select: { name: true, avatarUrl: true } },
      promotedBy:{ select: { name: true } },
    },
  })

  return NextResponse.json({
    id:          updated.id,
    userName:    updated.user.name,
    userAvatar:  updated.user.avatarUrl,
    fromBelt:    updated.fromBelt,
    toBelt:      updated.toBelt,
    toDegree:    updated.toDegree ?? 0,
    gradedAt:    updated.gradedAt.toISOString(),
    instructor:  updated.promotedBy?.name ?? null,
    notes:       updated.notes,
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
