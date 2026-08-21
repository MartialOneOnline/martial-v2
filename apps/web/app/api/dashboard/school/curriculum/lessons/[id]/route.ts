import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess, DASHBOARD_ROLES } from '@/lib/auth/contexts'
import { mux } from '@/lib/mux'

async function requireStaffSchoolId(userId: string, role: string) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return null
  if (role !== 'SUPERADMIN') {
    const member = await requireSchoolAccess(userId, schoolId).catch(() => null)
    if (!member || !DASHBOARD_ROLES.includes(member.role)) return null
  }
  return schoolId
}

// PATCH /api/dashboard/school/curriculum/lessons/[id]
// Body: any of { title, category, description, sortOrder, curriculumId }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.curriculumLesson.findUnique({ where: { id }, select: { schoolId: true } })
  if (!existing || existing.schoolId !== schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string') data.title = body.title.trim()
  if (typeof body.category === 'string' || body.category === null) data.category = body.category
  if (typeof body.description === 'string' || body.description === null) data.description = body.description
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
  if (typeof body.curriculumId === 'string') {
    // Moving a lesson to another curriculum — verify the target belongs to
    // the same school, otherwise this would let staff move a lesson into a
    // curriculum owned by a different school.
    const target = await prisma.curriculum.findUnique({ where: { id: body.curriculumId }, select: { schoolId: true } })
    if (!target || target.schoolId !== schoolId) return NextResponse.json({ error: 'Target curriculum not found' }, { status: 404 })
    data.curriculumId = body.curriculumId
  }

  const lesson = await prisma.curriculumLesson.update({ where: { id }, data })
  return NextResponse.json({ lesson })
}

// DELETE /api/dashboard/school/curriculum/lessons/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.curriculumLesson.findUnique({
    where: { id },
    select: { schoolId: true, muxAssetId: true },
  })
  if (!existing || existing.schoolId !== schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Best-effort — an orphaned Mux asset costs a few cents of storage and
  // doesn't block the school from removing the lesson from their curriculum.
  if (existing.muxAssetId) {
    await mux.video.assets.delete(existing.muxAssetId).catch(() => {})
  }

  await prisma.curriculumLesson.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
