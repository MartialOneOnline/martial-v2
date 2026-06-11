import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email/sendInvite'

// GET /api/admin/invitations — list all invitations
export async function GET() {
  const invitations = await prisma.schoolInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { name: true, email: true } },
      school: { select: { id: true, slug: true, name: true, status: true } },
    },
  })
  return NextResponse.json(invitations)
}

// POST /api/admin/invitations — create single invite
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, city, country, activities, website, notes } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
  }

  // Check for existing invite with same email
  const existing = await prisma.schoolInvitation.findFirst({
    where: { email: email.toLowerCase().trim() },
  })
  if (existing) {
    return NextResponse.json({ error: 'An invitation for this email already exists' }, { status: 409 })
  }

  const invitation = await prisma.schoolInvitation.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      city: city || null,
      country: country || null,
      activities: activities || null,
      website: website || null,
      notes: notes || null,
      status: 'SENT',
      source: 'MANUAL',
      sentAt: new Date(),
    },
  })

  // Send invitation email (non-blocking — don't fail the API if email fails)
  const emailResult = await sendInviteEmail({
    invitationId: invitation.id,
    schoolName: invitation.name,
    recipientEmail: invitation.email,
    city: invitation.city,
  })

  if (!emailResult.success) {
    // Log but still return success — invitation is saved in DB
    console.warn('[POST /api/admin/invitations] Email failed:', emailResult.error)
    return NextResponse.json(
      { ...invitation, emailSent: false, emailError: emailResult.error },
      { status: 201 }
    )
  }

  return NextResponse.json({ ...invitation, emailSent: true }, { status: 201 })
}
