import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getResend, FROM } from '@/lib/email/resend'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role))
        return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

import type { Prisma } from '@/lib/prisma-client/client'

// Audience → Prisma where clause on SchoolMember
function audienceWhere(audience: string, schoolId: string): Prisma.SchoolMemberWhereInput {
  const base: Prisma.SchoolMemberWhereInput = { schoolId, status: { not: 'ARCHIVED' } }
  switch (audience) {
    case 'All Students':
      return { ...base, role: 'STUDENT' }
    case 'Active Members':
      return { schoolId, role: 'STUDENT', status: 'ACTIVE' }
    case 'Inactive (30+ days)':
      return { schoolId, role: 'STUDENT', status: 'INACTIVE' }
    case 'Trial Students':
      return { schoolId, role: 'STUDENT', status: 'LEAD' }
    case 'Staff Only':
      return { schoolId, role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR'] }, status: { not: 'ARCHIVED' } }
    default:
      return { ...base, role: 'STUDENT' }
  }
}

function buildBroadcastHtml({
  schoolName, subject, body,
}: { schoolName: string; subject: string; body: string }): string {
  const C = {
    primary: '#0071E3', navy: '#0E3A7A', cyan: '#7DE7EC',
    bg: '#F4F6F9', card: '#FFFFFF', text: '#111827', muted: '#6B7280', border: '#E5E7EB',
  }
  // Preserve line breaks
  const htmlBody = body.replace(/\n/g, '<br />')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:${C.navy};border-radius:12px;padding:10px 20px;">
              <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">MARTIAL</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${C.card};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header gradient -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:linear-gradient(135deg,${C.primary} 0%,${C.navy} 100%);padding:28px 40px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:${C.cyan};text-transform:uppercase;letter-spacing:0.08em;">${schoolName}</p>
              <p style="margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.3;">${subject || 'Message from your school'}</p>
            </td>
          </tr></table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:32px 40px;">
              <p style="margin:0;font-size:14px;color:${C.muted};line-height:1.7;">${htmlBody}</p>
            </td>
          </tr></table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Sent by Martial on behalf of ${schoolName}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color:#9CA3AF;">martial.one</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// POST /api/dashboard/messages — broadcast message to school members
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { audience, channel, subject, message } = await req.json()

  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (channel !== 'Email')
    return NextResponse.json({ error: `${channel} channel is not available yet — use Email` }, { status: 400 })

  // Load school name
  const school = await prisma.school.findUnique({
    where: { id: auth.schoolId },
    select: { name: true },
  })

  // Resolve recipients
  const members = await prisma.schoolMember.findMany({
    where: audienceWhere(audience ?? 'All Students', auth.schoolId),
    select: { user: { select: { email: true } } },
  })

  const recipients = members
    .map(m => m.user?.email)
    .filter((e): e is string => !!e)

  if (recipients.length === 0)
    return NextResponse.json({ error: 'No recipients found for this audience' }, { status: 400 })

  const html = buildBroadcastHtml({
    schoolName: school?.name ?? 'Your school',
    subject: subject?.trim() || 'Message from your school',
    body: message.trim(),
  })

  const emailSubject = subject?.trim()
    ? `${subject.trim()} — ${school?.name ?? 'Martial'}`
    : `Message from ${school?.name ?? 'your school'}`

  // Send individually (BCC-safe, Resend batch limit)
  const resend = getResend()
  const results = await Promise.allSettled(
    recipients.map(to =>
      resend.emails.send({ from: FROM, to, subject: emailSubject, html })
    )
  )

  const sent  = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  if (sent === 0)
    return NextResponse.json({ error: 'All emails failed to send' }, { status: 500 })

  return NextResponse.json({ sent, failed, total: recipients.length })
}
