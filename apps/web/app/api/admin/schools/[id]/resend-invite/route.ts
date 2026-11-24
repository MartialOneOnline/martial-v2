import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadminUser } from '@/lib/auth/server'
import { ClaimError } from '@/lib/claims/errors'
import { deliverInvitation, prepareInvitation } from '@/lib/claims/invitations'
import { isInvitationOpen } from '@/lib/claims/status'

// POST /api/admin/schools/[id]/resend-invite { recipientEmail, recipientName? }
// Owner invitation for a school without an ownership request (All Schools →
// "Invite owner"). Same canonical path as requests: one open invitation per
// school, never when an owner exists, recipient confirmed by the admin (NOT
// silently School.email), School.email never changed, and "sent" only when
// Resend accepted it. An open invitation is re-delivered: retry if the last
// outcome was unknown/failed, otherwise a new link. A retry after Resend's
// idempotency window (409 RETRY_WINDOW_PASSED) or on an expired link (409
// LINK_EXPIRED) is refused; the admin then confirms
// an explicit new link with { newLink: true } (old link disabled).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin
  const { id } = await params
  const body = await req.json().catch(() => ({})) as { recipientEmail?: unknown; recipientName?: unknown; newLink?: unknown }
  if (typeof body.recipientEmail !== 'string' || !body.recipientEmail.trim()) {
    return NextResponse.json({ error: 'Enter the recipient email', code: 'INVALID_INPUT' }, { status: 400 })
  }
  try {
    const school = await prisma.school.findUnique({ where: { id }, select: { id: true } })
    if (!school) throw new ClaimError('NOT_FOUND', 'School not found')

    const open = (await prisma.schoolInvitation.findMany({ where: { schoolId: id, claimRequestId: null, revokedAt: null, usedAt: null }, orderBy: { createdAt: 'desc' } }))
      .filter(i => isInvitationOpen(i) && i.deliveryStatus)
    const existing = open.find(i => (i.sentToEmail ?? i.email).toLowerCase() === body.recipientEmail!.toString().trim().toLowerCase())

    let result
    if (existing && existing.deliveryStatus !== 'PREPARED') {
      const mode = body.newLink === true ? 'resend'
        : existing.deliveryStatus === 'FAILED' || existing.deliveryStatus === 'UNCERTAIN' || existing.deliveryStatus === 'SENDING' ? 'retry' : 'resend'
      result = await deliverInvitation(existing.id, mode, admin.id)
    } else {
      const { invitationId } = await prepareInvitation({
        schoolId: id, claimRequestId: null, recipientEmail: body.recipientEmail,
        recipientName: typeof body.recipientName === 'string' ? body.recipientName : null, actorUserId: admin.id,
      })
      result = await deliverInvitation(invitationId, 'send', admin.id)
    }
    if (result.outcome.kind === 'accepted') return NextResponse.json({ ok: true, delivery: result.outcome })
    return NextResponse.json({
      ok: false, delivery: result.outcome,
      error: result.outcome.kind === 'rejected'
        ? `Not sent — Resend rejected it (${result.outcome.message}). Fix the cause and try again.`
        : 'Unknown whether the email went out. Trying again is safe: no duplicate will be delivered.',
    }, { status: 502 })
  } catch (err) {
    if (err instanceof ClaimError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    console.error('[admin/resend-invite] failed:', err)
    return NextResponse.json({ error: 'Something went wrong. Nothing was confirmed.' }, { status: 500 })
  }
}
