import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// POST /api/my/curriculum/lessons/[id]/view
// Called once from MyCurriculumClient when playback reaches ~90% or ends —
// not on play start, so a few seconds of playback doesn't count as
// "watched". Re-checks membership itself rather than trusting that the
// lesson ever appeared in a prior /api/my/curriculum response — a
// membership could have lapsed between that GET and this POST.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lesson = await prisma.curriculumLesson.findUnique({ where: { id }, select: { schoolId: true, status: true } })
  if (!lesson || lesson.status !== 'READY') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId: lesson.schoolId, userId: user.id } },
    select: { role: true, status: true },
  })
  if (!member || member.role !== 'STUDENT' || member.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.curriculumLessonView.upsert({
    where: { lessonId_userId: { lessonId: id, userId: user.id } },
    create: { lessonId: id, userId: user.id },
    update: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
