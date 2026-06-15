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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const existing = await prisma.gradingSystem.findFirst({ where: { id, schoolId: a.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.isDefault) {
    await prisma.gradingSystem.updateMany({ where: { schoolId: a.schoolId }, data: { isDefault: false } })
  }

  const system = await prisma.gradingSystem.update({
    where: { id },
    data: {
      ...(body.name !== undefined        && { name: body.name }),
      ...(body.activity !== undefined    && { activity: body.activity }),
      ...(body.isDefault !== undefined   && { isDefault: body.isDefault }),
      ...(body.requireApproval !== undefined  && { requireApproval: body.requireApproval }),
      ...(body.gradingFee !== undefined       && { gradingFee: body.gradingFee }),
      ...(body.notifyStudent !== undefined    && { notifyStudent: body.notifyStudent }),
      ...(body.notifyInstructor !== undefined && { notifyInstructor: body.notifyInstructor }),
    },
    include: { ranks: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ system })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const existing = await prisma.gradingSystem.findFirst({ where: { id, schoolId: a.schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.gradingSystem.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
