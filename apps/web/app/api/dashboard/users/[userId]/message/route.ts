import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { createNotification } from '@/lib/notifications/create'
import { getResend, FROM } from '@/lib/email/resend'

// POST /api/dashboard/users/[userId]/message
// Send an in-app notification + email to a school member from the admin.
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId: schoolMemberId } = await params

  const admin = await getAuthUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (admin.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(admin.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(m.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { message } = await req.json() as { message: string }
  if (!message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  // Resolve member
  const schoolMember = await prisma.schoolMember.findFirst({
    where: { id: schoolMemberId, schoolId },
    select: {
      userId: true,
      user: { select: { id: true, email: true, name: true } },
      school: { select: { name: true } },
    },
  })
  if (!schoolMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const adminUser = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { name: true },
  })

  // In-app notification — targeted at this member only, not the whole school's staff
  await createNotification({
    schoolId,
    type:    'MESSAGE',
    title: `Mensaje de ${adminUser?.name ?? 'tu academia'}`,
    body:  message.trim(),
    recipientUserId: schoolMember.userId,
  })

  // Email (fire-and-forget)
  if (schoolMember.user?.email) {
    getResend().emails.send({
      from:    FROM,
      to:      schoolMember.user.email,
      subject: `Mensaje de ${schoolMember.school.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
          <p style="font-size:15px;color:#111827;margin:0 0 16px">Hola ${schoolMember.user.name ?? ''},</p>
          <div style="background:#F9FAFB;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px">
            <p style="font-size:15px;color:#374151;margin:0;white-space:pre-wrap">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin:0">— ${schoolMember.school.name}</p>
        </div>
      `,
    }).catch(err => console.error('[message] email failed:', err))
  }

  return NextResponse.json({ ok: true })
}
