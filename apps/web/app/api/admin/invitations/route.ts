import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email/sendInvite'
import { guardSuperadmin } from '@/lib/auth/server'

// GET /api/admin/invitations — list invitations with optional search/filter/pagination
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status

  const [invitations, total] = await Promise.all([
    prisma.schoolInvitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        invitedBy: { select: { name: true, email: true } },
        school: { select: { id: true, slug: true, name: true, status: true } },
      },
    }),
    prisma.schoolInvitation.count({ where }),
  ])

  return NextResponse.json({ invitations, total, pages: Math.ceil(total / limit) })
}

// PATCH /api/admin/invitations — send a pending invite
export async function PATCH(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id, action } = await req.json()
  if (!id || action !== 'send') return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const invitation = await prisma.schoolInvitation.findUnique({ where: { id } })
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.schoolInvitation.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } })

  await sendInviteEmail({
    invitationId: invitation.id,
    schoolName: invitation.name,
    recipientEmail: invitation.email,
    city: invitation.city,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

// POST /api/admin/invitations — create single invite
export async function POST(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

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
