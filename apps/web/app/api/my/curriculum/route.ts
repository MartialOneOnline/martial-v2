import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'
import { getSchoolModules } from '@/lib/school-modules'
import { signCurriculumPlaybackToken } from '@/lib/mux'

// GET /api/my/curriculum
// Gated by: real STUDENT-role, ACTIVE SchoolMember at the resolved school
// (not LEAD/FROZEN — this is the "active membership" the Curriculum module
// toggle description promises, stricter than the general /my entry check in
// hasStudentAccess()) AND the school having modules.curriculum enabled.
// Returns curriculums (named, school-defined programs) each with their
// READY lessons — tokens are minted for every lesson up front rather than
// via a separate per-lesson endpoint, since the membership check already
// happened here and a 2h signed token isn't a meaningfully bigger exposure
// than minting one at a time.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentContext = await getActiveStudentContext(user.id)
  if (studentContext.kind !== 'ok') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  const schoolId = studentContext.schoolId

  const [member, school] = await Promise.all([
    prisma.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId, userId: user.id } },
      select: { role: true, status: true },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { modules: true } }),
  ])

  if (!member || member.role !== 'STUDENT' || member.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!school || !getSchoolModules(school.modules).curriculum) {
    return NextResponse.json({ error: 'Module disabled' }, { status: 403 })
  }

  const curriculums = await prisma.curriculum.findMany({
    where: { schoolId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      lessons: {
        where: { status: 'READY' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, category: true, description: true, muxPlaybackId: true, durationSec: true },
      },
    },
  })

  const withTokens = await Promise.all(
    curriculums.map(async c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      lessons: await Promise.all(
        c.lessons.map(async l => ({
          ...l,
          playbackToken: l.muxPlaybackId ? await signCurriculumPlaybackToken(l.muxPlaybackId) : null,
        }))
      ),
    }))
  )

  return NextResponse.json({ curriculums: withTokens })
}
