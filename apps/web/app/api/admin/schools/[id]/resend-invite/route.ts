import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { sendInviteEmail } from '@/lib/email/sendInvite'

// POST /api/admin/schools/[id]/resend-invite — (re)send the claim-your-school email
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!school.email) {
    return NextResponse.json({ error: 'School has no contact email — add one via Edit first' }, { status: 400 })
  }

  let invitation = await prisma.schoolInvitation.findFirst({
    where: { schoolId: id },
    orderBy: { createdAt: 'desc' },
  })

  if (invitation) {
    invitation = await prisma.schoolInvitation.update({
      where: { id: invitation.id },
      data: { status: 'SENT', sentAt: new Date() },
    })
  } else {
    invitation = await prisma.schoolInvitation.create({
      data: {
        name: school.name,
        email: school.email,
        schoolId: school.id,
        city: school.city,
        country: school.country,
        website: school.website,
        status: 'SENT',
        source: 'MANUAL',
        sentAt: new Date(),
      },
    })
  }

  const emailResult = await sendInviteEmail({
    invitationId: invitation.id,
    schoolName: school.name,
    recipientEmail: school.email,
    city: school.city,
    country: school.country,
    address: school.address,
    website: school.website,
  })

  if (!emailResult.success) {
    return NextResponse.json({ error: emailResult.error ?? 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
