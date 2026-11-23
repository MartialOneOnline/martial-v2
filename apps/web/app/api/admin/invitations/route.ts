import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin, guardSuperadminUser } from '@/lib/auth/server'
import { ClaimError } from '@/lib/claims/errors'
import { deliverInvitation, ensurePrepared } from '@/lib/claims/invitations'
import { isValidEmail, normalizeEmail } from '@/lib/claims/token'

// Pipeline invitations (Admin → Invitations) share the owner-invitation path
// in lib/claims: hashed single-use token, Idempotency-Key, honest delivery
// state. A pipeline row has no school; accepting it creates the school once.
// newLink: explicit new link (old one disabled) — what the admin confirms
// after a retry is refused with RETRY_WINDOW_PASSED.
async function deliver(invitationId: string, actorUserId: string, newLink = false) {
  const inv = await prisma.schoolInvitation.findUnique({ where: { id: invitationId }, select: { deliveryStatus: true } })
  await ensurePrepared(invitationId)
  const mode = !inv?.deliveryStatus || inv.deliveryStatus === 'PREPARED' ? 'send'
    : newLink || inv.deliveryStatus === 'ACCEPTED' ? 'resend' : 'retry'
  return deliverInvitation(invitationId, mode, actorUserId)
}

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
      omit: { token: true, tokenHash: true, tokenNonce: true },
      include: {
        invitedBy: { select: { name: true, email: true } },
        school: { select: { id: true, slug: true, name: true, status: true } },
      },
    }),
    prisma.schoolInvitation.count({ where }),
  ])

  return NextResponse.json({ invitations, total, pages: Math.ceil(total / limit) })
}

// PATCH /api/admin/invitations — send (or re-send) a pipeline invite
export async function PATCH(req: NextRequest) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin

  const { id, action } = await req.json()
  if (!id || (action !== 'send' && action !== 'new_link')) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  try {
    const { outcome } = await deliver(id, admin.id, action === 'new_link')
    if (outcome.kind !== 'accepted') {
      return NextResponse.json({ ok: false, delivery: outcome, error: outcome.kind === 'rejected' ? `Not sent: ${outcome.message}` : 'Unknown whether the email went out — retry is safe' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, delivery: outcome })
  } catch (err) {
    if (err instanceof ClaimError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    throw err
  }
}

// POST /api/admin/invitations — create single invite
export async function POST(req: NextRequest) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin

  const body = await req.json()
  const { name, email, phone, city, country, activities, website, notes } = body

  if (!name || !email || !isValidEmail(normalizeEmail(String(email)))) {
    return NextResponse.json({ error: 'name and a valid email are required' }, { status: 400 })
  }

  // Check for existing invite with same email
  const existing = await prisma.schoolInvitation.findFirst({
    where: { email: email.toLowerCase().trim() },
  })
  if (existing) {
    return NextResponse.json({ error: 'An invitation for this email already exists' }, { status: 409 })
  }

  const invitation = await prisma.schoolInvitation.create({
    omit: { token: true, tokenHash: true, tokenNonce: true },
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      city: city || null,
      country: country || null,
      activities: activities || null,
      website: website || null,
      notes: notes || null,
      status: 'PENDING',
      source: 'MANUAL',
      invitedById: admin.id,
    },
  })

  // Saved first; the email result is reported honestly (never "sent" when
  // Resend rejected it or the outcome is unknown).
  try {
    const { outcome } = await deliver(invitation.id, admin.id)
    return NextResponse.json({
      ...invitation, emailSent: outcome.kind === 'accepted',
      ...(outcome.kind === 'accepted' ? {} : { emailError: outcome.kind === 'rejected' ? outcome.message : 'Unknown whether the email went out — retry is safe' }),
    }, { status: 201 })
  } catch (err) {
    console.warn('[POST /api/admin/invitations] Email failed:', err)
    return NextResponse.json({ ...invitation, emailSent: false, emailError: err instanceof Error ? err.message : 'Failed' }, { status: 201 })
  }
}
