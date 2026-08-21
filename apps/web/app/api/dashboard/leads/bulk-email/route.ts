import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { getResend, FROM } from '@/lib/email/resend'
import { buildDirectMessageEmail } from '@/lib/email/templates/directMessage'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, 'school.leads.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// POST /api/dashboard/leads/bulk-email — send a free-form email to many leads at once,
// then bump any freshly-emailed NEW lead to CONTACTED (sending the email is the contact event).
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const ids = body.ids
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids must be a non-empty array of strings' }, { status: 400 })
  }
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const [leads, school] = await Promise.all([
    prisma.lead.findMany({ where: { id: { in: ids }, schoolId: auth.schoolId }, select: { id: true, name: true, email: true } }),
    prisma.school.findUnique({ where: { id: auth.schoolId }, select: { name: true } }),
  ])

  const schoolName = school?.name ?? 'Your school'
  const resend = getResend()
  const withEmail = leads.filter(l => !!l.email)
  const skipped = leads.length - withEmail.length

  const contactedIds: string[] = []
  await Promise.all(withEmail.map(async lead => {
    const html = buildDirectMessageEmail({ studentName: lead.name, schoolName, message })
    try {
      const { error } = await resend.emails.send({ from: FROM, to: lead.email as string, subject, html })
      if (!error) contactedIds.push(lead.id)
    } catch (err) {
      console.error('[leads/bulk-email] Resend error:', err)
    }
  }))

  if (contactedIds.length > 0) {
    await prisma.lead.updateMany({ where: { id: { in: contactedIds }, status: 'NEW' }, data: { status: 'CONTACTED' } })
  }

  return NextResponse.json({ ok: true, sent: contactedIds.length, skipped, failed: withEmail.length - contactedIds.length })
}
