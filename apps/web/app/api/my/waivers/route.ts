import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

// GET /api/my/waivers — the current student's waivers across the school(s)
// they belong to (pending first). Scoped to the active school context when
// the student is in 2+ schools, same as /api/my/payments.
export async function GET() {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  const schoolId = studentContext.kind === 'ok' ? studentContext.schoolId : undefined

  const rows = await prisma.userWaiver.findMany({
    where: { userId: dbUser.id, ...(schoolId && { waiver: { schoolId } }) },
    include: { waiver: { select: { id: true, title: true, content: true, version: true, schoolId: true, school: { select: { name: true } } } } },
    orderBy: [{ signedAt: 'asc' }, { createdAt: 'desc' }],
  })

  const waivers = rows.map(r => ({
    id: r.id,
    title: r.waiver.title,
    content: r.waiver.content,
    version: r.waiver.version,
    schoolName: r.waiver.school.name,
    signedAt: r.signedAt?.toISOString() ?? null,
    revoked: !!r.revokedAt,
    pending: !r.signedAt || !!r.revokedAt,
  }))

  return NextResponse.json({ waivers })
}
