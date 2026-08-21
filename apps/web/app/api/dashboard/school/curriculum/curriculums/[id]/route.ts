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

// PATCH /api/dashboard/school/curriculum/curriculums/[id]
// Body: any of { name, description, sortOrder }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.curriculum.findUnique({ where: { id }, select: { schoolId: true } })
  if (!existing || existing.schoolId !== schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if (typeof body.description === 'string' || body.description === null) data.description = body.description
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

  const curriculum = await prisma.curriculum.update({ where: { id }, data })
  return NextResponse.json({ curriculum })
}

// DELETE /api/dashboard/school/curriculum/curriculums/[id]
// Cascades to its lessons (and their Mux assets, best-effort) — this is a
// real "delete this whole program" action, confirmed in the UI before it
// ever reaches here.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.curriculum.findUnique({
    where: { id },
    select: { schoolId: true, lessons: { select: { muxAssetId: true } } },
  })
  if (!existing || existing.schoolId !== schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await Promise.all(
    existing.lessons
      .filter(l => l.muxAssetId)
      .map(l => mux.video.assets.delete(l.muxAssetId as string).catch(() => {}))
  )

  await prisma.curriculum.delete({ where: { id } }) // onDelete: Cascade removes lessons + views
  return NextResponse.json({ ok: true })
}
