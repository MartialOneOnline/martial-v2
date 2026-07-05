import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { createNotification } from '@/lib/notifications/create'
import { getResend, FROM } from '@/lib/email/resend'

// POST /api/admin/users/[id]/message — superadmin sends a user an email and/or
// an in-app notification (only possible if the user has staff access to a
// school's dashboard — plain students have no notification inbox today).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const { message, email, push } = await req.json() as { message: string; email?: boolean; push?: boolean }
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true, name: true,
      schoolMembers: {
        where: { role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] } },
        select: { schoolId: true },
        take: 1,
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (push && user.schoolMembers[0]) {
    createNotification({
      schoolId: user.schoolMembers[0].schoolId,
      type: 'MESSAGE',
      title: 'Message from Martial Admin',
      body: message.trim(),
      recipientUserId: id,
    })
  }

  if (email) {
    await getResend().emails.send({
      from: FROM,
      to: user.email,
      subject: 'Message from Martial Admin',
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
          <p style="font-size:15px;color:#111827;margin:0 0 16px">Hola ${user.name ?? ''},</p>
          <div style="background:#F9FAFB;border-radius:12px;padding:20px;border:1px solid #E5E7EB;margin-bottom:20px">
            <p style="font-size:15px;color:#374151;margin:0;white-space:pre-wrap">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="font-size:12px;color:#9CA3AF;margin:0">— Martial</p>
        </div>
      `,
    }).catch(err => console.error('[admin/users/message] email failed:', err))
  }

  return NextResponse.json({ ok: true })
}
