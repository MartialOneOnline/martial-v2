import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess, DASHBOARD_ROLES } from '@/lib/auth/contexts'
import { createCurriculumUpload, pollUploadStatus, signCurriculumThumbnailToken } from '@/lib/mux'

async function requireStaffSchoolId(userId: string, role: string) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return null
  if (role !== 'SUPERADMIN') {
    const member = await requireSchoolAccess(userId, schoolId).catch(() => null)
    if (!member || !DASHBOARD_ROLES.includes(member.role)) return null
  }
  return schoolId
}

// GET /api/dashboard/school/curriculum/lessons?curriculumId=...
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const curriculumId = req.nextUrl.searchParams.get('curriculumId')

  const [lessons, activeStudentCount] = await Promise.all([
    prisma.curriculumLesson.findMany({
      where: { schoolId, ...(curriculumId ? { curriculumId } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { views: true } } },
    }),
    prisma.schoolMember.count({ where: { schoolId, role: 'STUDENT', status: 'ACTIVE' } }),
  ])

  // Reconcile anything still mid-flight — see pollUploadStatus() for why
  // this exists alongside the webhook rather than instead of it (Mux can't
  // reach a webhook URL on localhost, and even in prod a delivery can drop).
  const pending = lessons.filter(l => l.status === 'UPLOADING' || l.status === 'PROCESSING')
  await Promise.all(
    pending.map(async l => {
      if (!l.muxUploadId) return
      try {
        const result = await pollUploadStatus(l.muxUploadId)
        if (!result) return
        const updated = await prisma.curriculumLesson.update({ where: { id: l.id }, data: result })
        Object.assign(l, updated)
      } catch {
        // best-effort — the webhook is still the primary path when it works
      }
    })
  )

  const withThumbnails = await Promise.all(
    lessons.map(async l => ({
      ...l,
      thumbnailToken: l.muxPlaybackId ? await signCurriculumThumbnailToken(l.muxPlaybackId) : null,
    }))
  )

  return NextResponse.json({ lessons: withThumbnails, activeStudentCount })
}

// POST /api/dashboard/school/curriculum/lessons
// Body: { curriculumId, title, category?, description? }
// Creates the metadata row (status UPLOADING) and a Mux direct-upload URL in
// one call — the browser then PUTs the file straight to Mux with that URL,
// see MuxUploaderField in CurriculumClient.tsx. video.asset.ready webhook
// (app/api/webhooks/mux/route.ts) flips status to READY once transcoded.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const curriculumId = typeof body?.curriculumId === 'string' ? body.curriculumId : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const category = typeof body?.category === 'string' ? body.category.trim() : null
  const description = typeof body?.description === 'string' ? body.description.trim() : null

  if (!curriculumId || !title) {
    return NextResponse.json({ error: 'curriculumId and title are required' }, { status: 400 })
  }

  const curriculum = await prisma.curriculum.findUnique({ where: { id: curriculumId }, select: { schoolId: true } })
  if (!curriculum || curriculum.schoolId !== schoolId) {
    return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { uploadId, uploadUrl } = await createCurriculumUpload(appUrl)

  const lesson = await prisma.curriculumLesson.create({
    data: { schoolId, curriculumId, title, category, description, muxUploadId: uploadId, createdById: user.id },
  })

  return NextResponse.json({ lesson, uploadUrl })
}
