import { NextRequest, NextResponse } from 'next/server'
import { guardSuperadminUser } from '@/lib/auth/server'
import { claimRequestDetail } from '@/lib/claims/adminViews'
import { ClaimError } from '@/lib/claims/errors'
import { createSchoolForRequest, linkSchool, rejectRequest, reopenRequest, unlinkSchool } from '@/lib/claims/requests'
import { deliverInvitation, prepareInvitation, revokeInvitation } from '@/lib/claims/invitations'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin
  const { id } = await params
  const detail = await claimRequestDetail(id)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(detail)
}

async function invitationOfRequest(requestId: string, invitationId: unknown) {
  if (typeof invitationId !== 'string') throw new ClaimError('INVALID_INPUT', 'invitationId is required')
  const inv = await prisma.schoolInvitation.findFirst({ where: { id: invitationId, claimRequestId: requestId }, select: { id: true, deliveryStatus: true } })
  if (!inv) throw new ClaimError('NOT_FOUND', 'Invitation not found for this request')
  return inv
}

// POST /api/admin/claim-requests/[id] { action, ... } — every state change of
// a request. Each action validates the transition server-side and is safe to
// repeat (double click / two admins): the loser gets a 409, never a second
// school, invitation or email.
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  try {
    switch (body.action) {
      case 'link':
        if (typeof body.schoolId !== 'string') throw new ClaimError('INVALID_INPUT', 'schoolId is required')
        await linkSchool(id, body.schoolId, admin.id)
        break
      case 'unlink':
        await unlinkSchool(id, admin.id)
        break
      case 'create_school':
        await createSchoolForRequest(id, body, admin.id)
        break
      case 'reject':
        await rejectRequest(id, body.reason, admin.id)
        break
      case 'reopen':
        await reopenRequest(id, admin.id)
        break
      case 'send_invitation': {
        const request = await prisma.claimRequest.findUnique({ where: { id }, select: { schoolId: true } })
        if (!request) throw new ClaimError('NOT_FOUND', 'Request not found')
        if (!request.schoolId) throw new ClaimError('SCHOOL_NOT_LINKED', 'Link a school first')
        if (typeof body.recipientEmail !== 'string') throw new ClaimError('INVALID_INPUT', 'recipientEmail is required')
        const { invitationId } = await prepareInvitation({
          schoolId: request.schoolId, claimRequestId: id, recipientEmail: body.recipientEmail,
          recipientName: typeof body.recipientName === 'string' ? body.recipientName : null, actorUserId: admin.id,
        })
        const result = await deliverInvitation(invitationId, 'send', admin.id)
        return NextResponse.json({ ok: result.outcome.kind === 'accepted', delivery: result.outcome, detail: await claimRequestDetail(id) })
      }
      case 'retry_invitation':
      case 'resend_invitation': {
        const inv = await invitationOfRequest(id, body.invitationId)
        // A prepared-but-never-sent invitation (e.g. the first send was
        // interrupted before reaching Resend) is simply sent.
        const mode = inv.deliveryStatus === 'PREPARED' ? 'send' : body.action === 'retry_invitation' ? 'retry' : 'resend'
        const result = await deliverInvitation(inv.id, mode, admin.id)
        return NextResponse.json({ ok: result.outcome.kind === 'accepted', delivery: result.outcome, detail: await claimRequestDetail(id) })
      }
      case 'revoke_invitation':
        await revokeInvitation((await invitationOfRequest(id, body.invitationId)).id, admin.id)
        break
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    if (err instanceof ClaimError) {
      return NextResponse.json({ error: err.message, code: err.code, ...(err.details ?? {}) }, { status: err.status })
    }
    console.error('[admin/claim-requests] action failed:', body.action, err)
    return NextResponse.json({ error: 'Something went wrong. Nothing was confirmed — refresh to see the current state.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, detail: await claimRequestDetail(id) })
}
