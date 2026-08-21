import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { getResend, FROM } from '@/lib/email/resend'
import { buildDirectMessageEmail } from '@/lib/email/templates/directMessage'

// POST /api/dashboard/members/[id]/email — send a free-form email to this student
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.members.update')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const member = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    select: { user: { select: { email: true, name: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })

  const html = buildDirectMessageEmail({
    studentName: member.user.name,
    schoolName: school?.name ?? 'Your school',
    message,
  })

  try {
    await getResend().emails.send({ from: FROM, to: member.user.email, subject, html })
  } catch (err) {
    console.error('[member-email] Resend error:', err)
    return NextResponse.json({ error: 'Could not send the email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
