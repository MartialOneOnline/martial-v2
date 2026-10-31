import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildInviteStudentEmail, detectLang, getInviteSubject } from '@/lib/email/templates/inviteStudent'
import { createInviteUrl } from '@/lib/invites'

// POST /api/dashboard/members/[id]/resend-invite
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

  const member = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    select: { id: true, user: { select: { id: true, email: true, name: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, city: true, country: true, language: true },
  })

  // Our own token (see lib/invites.ts) — the redeem route tries 'invite'
  // then falls back to 'magiclink' itself, so this no longer needs to care
  // which one applies. schoolId travels as a query param so activate-member
  // can scope the PENDING->LEAD transition to this school — see
  // members/invite/route.ts.
  const inviteUrl = await createInviteUrl({
    email: member.user.email,
    schoolId,
    redirectTo: `${APP_URL}/auth/accept-invite?schoolId=${encodeURIComponent(schoolId)}`,
  })

  const lang = detectLang(school?.language ?? school?.country)
  const html = buildInviteStudentEmail({
    studentName: member.user.name,
    schoolName: school?.name ?? 'Your school',
    schoolCity: school?.city,
    inviteUrl,
    lang,
  })

  try {
    await getResend().emails.send({
      from: FROM,
      to: member.user.email,
      subject: getInviteSubject(school?.name ?? 'Your school', lang),
      html,
    })
  } catch (err) {
    console.error('[resend-invite] Resend error:', err)
  }

  return NextResponse.json({ ok: true })
}
