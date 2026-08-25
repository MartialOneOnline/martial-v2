import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess, DASHBOARD_ROLES } from '@/lib/auth/contexts'

async function requireStaffSchoolId(userId: string, role: string) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return null
  if (role !== 'SUPERADMIN') {
    const member = await requireSchoolAccess(userId, schoolId).catch(() => null)
    if (!member || !DASHBOARD_ROLES.includes(member.role)) return null
  }
  return schoolId
}

// GET /api/dashboard/school/curriculum/lessons/[id]/views
// Who has watched this lesson to completion — see the 90%-threshold logic
// in MyCurriculumClient.handleProgress for what creates these rows.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lesson = await prisma.curriculumLesson.findUnique({ where: { id }, select: { schoolId: true } })
  if (!lesson || lesson.schoolId !== schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const views = await prisma.curriculumLessonView.findMany({
    where: { lessonId: id },
    orderBy: { lastViewedAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  })

  return NextResponse.json({
    views: views.map(v => ({
      userId: v.user.id,
      name: v.user.name,
      email: v.user.email,
      avatarUrl: v.user.avatarUrl,
      viewCount: v.viewCount,
      lastViewedAt: v.lastViewedAt,
    })),
  })
}
