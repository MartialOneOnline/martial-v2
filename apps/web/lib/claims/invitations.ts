import { prisma } from '@/lib/db'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildOwnerInviteEmail, claimLang } from '@/lib/email/templates/claimEmails'
import { ClaimError } from './errors'
import { recordClaimEvent, recordClaimEventSafe } from './events'
import { classifyInviteSend, classifyThrown, type DeliveryOutcome } from './delivery'
import { deriveInvitationToken, hashInvitationToken, isValidEmail, newTokenNonce, normalizeEmail } from './token'
import { INVITATION_TTL_DAYS, INVITATION_TTL_MS, SAME_KEY_RETRY_WINDOW_MS, SENDING_STALE_MS, isInvitationOpen } from './status'
import type { Prisma } from '@/lib/prisma-client/client'

const UNCLAIMABLE = ['SUSPENDED', 'ARCHIVED']

type Db = typeof prisma
type Tx = Parameters<Parameters<Db['$transaction']>[0]>[0]

// ── Ownership ────────────────────────────────────────────────────────────────

// Users who already own a school: ACTIVE OWNER members, plus claimedById.
export async function schoolOwnerIds(db: Pick<Tx, 'school' | 'schoolMember'>, schoolId: string): Promise<string[]> {
  const [school, owners] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { claimedById: true } }),
    db.schoolMember.findMany({ where: { schoolId, role: 'OWNER', status: 'ACTIVE' }, select: { userId: true } }),
  ])
  const ids = new Set(owners.map(o => o.userId))
  if (school?.claimedById) ids.add(school.claimedById)
  return [...ids]
}

// Row lock on the school: serializes invitation preparation and acceptance
// for the same school (two admins, double clicks, concurrent accepts). Only
// ever taken inside short Prisma transactions — never around Resend/Supabase.
export async function lockSchool(tx: Tx, schoolId: string): Promise<{ id: string; status: string; name: string } | null> {
  const rows = await tx.$queryRaw<{ id: string; status: string; name: string }[]>`SELECT id, status::text AS status, name FROM schools WHERE id = ${schoolId} FOR UPDATE`
  return rows[0] ?? null
}

// Row lock on an ownership request. Lock order everywhere: invitation(s) →
// school → request. Rejecting a request locks the same row, so a request can
// never be dismissed while an invitation for it is being prepared or accepted
// (and vice versa): whichever commits second sees the other's result.
export async function lockClaimRequest(tx: Tx, requestId: string): Promise<{ id: string; status: string; schoolId: string | null } | null> {
  const rows = await tx.$queryRaw<{ id: string; status: string; schoolId: string | null }[]>`SELECT id, status::text AS status, "schoolId" FROM claim_requests WHERE id = ${requestId} FOR UPDATE`
  return rows[0] ?? null
}

// ── Prepare ──────────────────────────────────────────────────────────────────

export type PrepareInput = {
  schoolId: string
  claimRequestId: string | null
  recipientEmail: string
  recipientName: string | null
  actorUserId: string
}

// Creates the single open owner invitation for a school (or returns the same
// one on a repeated identical call). Refuses when the school already has an
// owner or another open invitation — replacing an owner is never automatic.
export async function prepareInvitation(input: PrepareInput): Promise<{ invitationId: string; created: boolean }> {
  const email = normalizeEmail(input.recipientEmail)
  if (!isValidEmail(email)) throw new ClaimError('INVALID_INPUT', 'Enter a valid recipient email')
  const recipientName = input.recipientName?.trim().slice(0, 120) || null

  return prisma.$transaction(async tx => {
    const school = await lockSchool(tx, input.schoolId)
    if (!school) throw new ClaimError('NOT_FOUND', 'School not found')
    if (UNCLAIMABLE.includes(school.status)) throw new ClaimError('SCHOOL_NOT_CLAIMABLE', `The school is ${school.status.toLowerCase()} — restore it before inviting an owner`)

    if (input.claimRequestId) {
      const request = await lockClaimRequest(tx, input.claimRequestId)
      if (!request) throw new ClaimError('NOT_FOUND', 'Request not found')
      if (request.status !== 'IN_PROGRESS' || request.schoolId !== input.schoolId) {
        throw new ClaimError('SCHOOL_NOT_LINKED', 'Link this school to the request before inviting')
      }
    }

    const owners = await schoolOwnerIds(tx, input.schoolId)
    if (owners.length > 0) {
      throw new ClaimError('OWNER_EXISTS', 'This school already has an owner. Changing the owner needs a manual review — no invitation was created.')
    }

    const open = (await tx.schoolInvitation.findMany({
      where: { schoolId: input.schoolId, usedAt: null, revokedAt: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    })).filter(isInvitationOpen)
    for (const inv of open) {
      // Old-style (pre-token) rows have no working link: retire them silently.
      if (!inv.deliveryStatus) {
        await tx.schoolInvitation.update({ where: { id: inv.id }, data: { isActive: false, revokedAt: new Date() } })
        continue
      }
      if (inv.claimRequestId === input.claimRequestId && normalizeEmail(inv.sentToEmail ?? inv.email) === email) {
        return { invitationId: inv.id, created: false }
      }
      throw new ClaimError('ACTIVE_INVITATION_EXISTS', `There is already an open invitation for this school (to ${inv.sentToEmail ?? inv.email}). Revoke it first.`, { invitationId: inv.id })
    }

    const nonce = newTokenNonce()
    const created = await tx.schoolInvitation.create({
      data: {
        name: recipientName ?? school.name,
        email,
        sentToEmail: email,
        schoolId: input.schoolId,
        claimRequestId: input.claimRequestId,
        invitedById: input.actorUserId,
        status: 'PENDING',
        source: 'MANUAL',
        deliveryStatus: 'PREPARED',
        tokenNonce: nonce,
      },
    })
    await tx.schoolInvitation.update({
      where: { id: created.id },
      data: { tokenHash: hashInvitationToken(deriveInvitationToken(created.id, nonce)) },
    })
    if (input.claimRequestId) {
      await recordClaimEvent(tx, input.claimRequestId, 'INVITATION_PREPARED', {
        actorUserId: input.actorUserId,
        data: { invitationId: created.id, recipientEmail: email, schoolId: input.schoolId, schoolName: school.name },
      })
    }
    return { invitationId: created.id, created: true }
  })
}

// Pipeline/import rows (no token yet) get one before their first send.
export async function ensurePrepared(invitationId: string): Promise<void> {
  const inv = await prisma.schoolInvitation.findUnique({ where: { id: invitationId } })
  if (!inv) throw new ClaimError('NOT_FOUND', 'Invitation not found')
  if (!isInvitationOpen(inv)) throw new ClaimError('INVITATION_CLOSED', 'This invitation was already accepted or revoked')
  if (inv.deliveryStatus) return
  const nonce = newTokenNonce()
  await prisma.schoolInvitation.updateMany({
    where: { id: inv.id, deliveryStatus: null, usedAt: null, revokedAt: null },
    data: {
      tokenNonce: nonce,
      tokenHash: hashInvitationToken(deriveInvitationToken(inv.id, nonce)),
      sentToEmail: normalizeEmail(inv.email),
      deliveryStatus: 'PREPARED',
      status: 'PENDING',
    },
  })
}

// ── Deliver ──────────────────────────────────────────────────────────────────

// send   — first send of a PREPARED invitation.
// retry  — technical retry. After UNCERTAIN (or a stale SENDING lock): same
//          token, same body, same Idempotency-Key → Resend never delivers a
//          second copy. After FAILED (Resend said nothing was sent): next
//          attempt key, same token.
// resend — explicit new email: new token (old link dies) and a fresh expiry.
export type DeliveryMode = 'send' | 'retry' | 'resend'

// The email exactly as first sent under an Idempotency-Key. The invitation
// link is stored as a placeholder (the raw token is never persisted) and is
// re-derived from the nonce, which is part of the key — so the rendered email
// is identical for every attempt with that key.
export const INVITE_URL_PLACEHOLDER = '__MARTIAL_CLAIM_INVITE_URL__'
export type FrozenInvitePayload = { v: 1; from: string; to: string; subject: string; html: string; text: string }

export function renderFrozenPayload(p: FrozenInvitePayload, inviteUrl: string) {
  const fill = (s: string) => s.split(INVITE_URL_PLACEHOLDER).join(inviteUrl)
  return { from: p.from, to: p.to, subject: p.subject, html: fill(p.html), text: fill(p.text) }
}

export type DeliveryResult = { outcome: DeliveryOutcome; invitationId: string }

export async function deliverInvitation(invitationId: string, mode: DeliveryMode, actorUserId: string | null): Promise<DeliveryResult> {
  const inv = await prisma.schoolInvitation.findUnique({
    where: { id: invitationId },
    include: {
      school: { select: { id: true, name: true, status: true, language: true } },
      claimRequest: { select: { id: true, locale: true, contactName: true } },
    },
  })
  if (!inv) throw new ClaimError('NOT_FOUND', 'Invitation not found')
  if (!isInvitationOpen(inv)) throw new ClaimError('INVITATION_CLOSED', 'This invitation was already accepted or revoked — it cannot be sent again. Prepare a new one if needed.')
  if (!inv.deliveryStatus || !inv.tokenNonce) throw new ClaimError('INVALID_TRANSITION', 'Prepare the invitation before sending it')
  if (inv.school && UNCLAIMABLE.includes(inv.school.status)) throw new ClaimError('SCHOOL_NOT_CLAIMABLE', 'The school is suspended or archived')
  if (inv.claimRequestId) {
    // Never email a link for a request that was rejected/closed meanwhile
    // (acceptance re-checks this under a lock as well).
    const request = await prisma.claimRequest.findUnique({ where: { id: inv.claimRequestId }, select: { status: true, schoolId: true } })
    if (!request || request.status !== 'IN_PROGRESS' || request.schoolId !== inv.schoolId) {
      throw new ClaimError('INVITATION_CLOSED', 'The ownership request is no longer in progress — nothing was sent.')
    }
  }
  if (inv.schoolId && (await schoolOwnerIds(prisma, inv.schoolId)).length > 0) {
    await recordClaimEventSafe(prisma, inv.claimRequestId, 'OWNER_CONFLICT', { actorUserId, data: { invitationId, at: 'send' } })
    throw new ClaimError('OWNER_EXISTS', 'This school already has an owner. Nothing was sent.')
  }

  const now = new Date()
  const stale = new Date(now.getTime() - SENDING_STALE_MS)
  const base = { id: inv.id, usedAt: null, revokedAt: null, isActive: true, tokenNonce: inv.tokenNonce }

  // A new Idempotency-Key (first send, retry after a provider rejection,
  // explicit resend) freezes the email as it is now. A retry under the SAME
  // key (outcome unknown) must send byte-identical content within Resend's
  // 24 h window: it reuses the frozen payload and is refused after the window,
  // because Resend would no longer recognise the key and could deliver twice.
  const freshPayload = (): FrozenInvitePayload => {
    const email = buildOwnerInviteEmail({
      lang: claimLang(inv.claimRequest?.locale ?? inv.school?.language),
      schoolName: inv.school?.name ?? inv.name,
      recipientName: inv.claimRequest?.contactName ?? null,
      inviteUrl: INVITE_URL_PLACEHOLDER,
      fromRequest: Boolean(inv.claimRequestId),
      ttlDays: INVITATION_TTL_DAYS,
    })
    return { v: 1, from: FROM, to: inv.sentToEmail ?? normalizeEmail(inv.email), subject: email.subject, html: email.html, text: email.text }
  }
  const newKey = (payload: FrozenInvitePayload) => ({ deliveryKeyAt: now, deliveryPayload: payload as unknown as Prisma.InputJsonValue })

  // Take the send lock with one conditional UPDATE: concurrent clicks/admins
  // race on it and only one proceeds.
  let claimed
  if (mode === 'send') {
    claimed = await prisma.schoolInvitation.updateMany({
      where: { ...base, deliveryStatus: 'PREPARED' },
      data: { deliveryStatus: 'SENDING', deliveryStartedAt: now, expiresAt: new Date(now.getTime() + INVITATION_TTL_MS), deliveryError: null, ...newKey(freshPayload()) },
    })
  } else if (mode === 'retry') {
    if (inv.expiresAt && inv.expiresAt <= now) {
      throw new ClaimError('NOTHING_TO_RETRY', 'This link has expired. Use “Resend” to send a new one.')
    }
    if (inv.deliveryStatus === 'FAILED') {
      // Resend rejected the previous attempt (nothing sent, key not stored):
      // a new attempt number is a new key, so the content may be rebuilt.
      claimed = await prisma.schoolInvitation.updateMany({
        where: { ...base, deliveryStatus: 'FAILED', deliveryAttempt: inv.deliveryAttempt },
        data: { deliveryStatus: 'SENDING', deliveryStartedAt: now, deliveryAttempt: inv.deliveryAttempt + 1, deliveryError: null, ...newKey(freshPayload()) },
      })
    } else if (inv.deliveryStatus === 'UNCERTAIN' || inv.deliveryStatus === 'SENDING') {
      if (!inv.deliveryKeyAt || !inv.deliveryPayload || now.getTime() - inv.deliveryKeyAt.getTime() > SAME_KEY_RETRY_WINDOW_MS) {
        throw new ClaimError('RETRY_WINDOW_PASSED',
          'More than 20 hours have passed since this email was first attempted, so a retry could reach the invitee twice. Check the Resend logs; if it never arrived, use “Resend” — it sends a new link and disables the old one.')
      }
      claimed = await prisma.schoolInvitation.updateMany({
        where: {
          ...base,
          deliveryAttempt: inv.deliveryAttempt,
          deliveryKeyAt: { gte: new Date(now.getTime() - SAME_KEY_RETRY_WINDOW_MS) },
          OR: [{ deliveryStatus: 'UNCERTAIN' }, { deliveryStatus: 'SENDING', deliveryStartedAt: { lt: stale } }],
        },
        data: { deliveryStatus: 'SENDING', deliveryStartedAt: now },
      })
    } else {
      throw new ClaimError('NOTHING_TO_RETRY', inv.deliveryStatus === 'ACCEPTED' ? 'Resend already accepted this email. Use “Resend” to send a new link.' : 'Send the invitation first')
    }
  } else {
    if (inv.deliveryStatus === 'SENDING' && inv.deliveryStartedAt && inv.deliveryStartedAt > stale) {
      throw new ClaimError('DELIVERY_BUSY', 'A send is already in progress')
    }
    const nonce = newTokenNonce()
    claimed = await prisma.schoolInvitation.updateMany({
      where: { ...base, deliveryStatus: inv.deliveryStatus, deliveryAttempt: inv.deliveryAttempt },
      data: {
        tokenNonce: nonce,
        tokenHash: hashInvitationToken(deriveInvitationToken(inv.id, nonce)),
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
        deliveryStatus: 'SENDING', deliveryStartedAt: now, deliveryAttempt: 0, deliveryError: null, providerMessageId: null,
        status: 'PENDING', openedAt: null,
        ...newKey(freshPayload()),
      },
    })
  }
  if (claimed.count !== 1) throw new ClaimError('DELIVERY_BUSY', 'This invitation changed or is already being sent. Refresh and try again.')

  const fresh = await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: inv.id } })
  const nonce = fresh.tokenNonce!
  const payload = fresh.deliveryPayload as unknown as FrozenInvitePayload
  const inviteUrl = `${APP_URL}/claim/${deriveInvitationToken(inv.id, nonce)}`
  const recipient = payload.to
  const idempotencyKey = `owner-invite/${inv.id}/${nonce}/${fresh.deliveryAttempt}`

  // No DB transaction or lock is held across this call.
  let outcome: DeliveryOutcome
  try {
    const res = await getResend().emails.send(
      renderFrozenPayload(payload, inviteUrl),
      { idempotencyKey },
    )
    outcome = classifyInviteSend(res as Parameters<typeof classifyInviteSend>[0])
  } catch (err) {
    outcome = classifyThrown(err)
  }

  const guard = { id: inv.id, tokenNonce: nonce, deliveryStatus: 'SENDING' as const }
  if (outcome.kind === 'accepted') {
    await prisma.schoolInvitation.updateMany({
      where: guard,
      data: { deliveryStatus: 'ACCEPTED', providerMessageId: outcome.id, deliveryError: null, sentAt: new Date() },
    })
    await prisma.schoolInvitation.updateMany({ where: { id: inv.id, status: 'PENDING' }, data: { status: 'SENT' } })
  } else {
    await prisma.schoolInvitation.updateMany({
      where: guard,
      data: { deliveryStatus: outcome.kind === 'rejected' ? 'FAILED' : 'UNCERTAIN', deliveryError: `${outcome.code}: ${outcome.message}`.slice(0, 500) },
    })
  }

  const eventType = outcome.kind === 'accepted' ? (mode === 'resend' ? 'INVITATION_RESENT' : 'INVITATION_SENT')
    : outcome.kind === 'rejected' ? 'INVITATION_SEND_FAILED' : 'INVITATION_SEND_UNCERTAIN'
  await recordClaimEventSafe(prisma, inv.claimRequestId, eventType, {
    actorUserId,
    data: {
      invitationId: inv.id, mode, recipientEmail: recipient,
      ...(outcome.kind === 'accepted' ? { providerMessageId: outcome.id } : { error: `${outcome.code}: ${outcome.message}` }),
    },
  })
  return { outcome, invitationId: inv.id }
}

// ── Revoke ───────────────────────────────────────────────────────────────────

export async function revokeInvitation(invitationId: string, actorUserId: string): Promise<void> {
  const inv = await prisma.schoolInvitation.findUnique({ where: { id: invitationId }, select: { id: true, claimRequestId: true } })
  if (!inv) throw new ClaimError('NOT_FOUND', 'Invitation not found')
  const res = await prisma.schoolInvitation.updateMany({
    where: { id: invitationId, usedAt: null, revokedAt: null, status: { not: 'REGISTERED' } },
    data: { revokedAt: new Date(), isActive: false },
  })
  if (res.count !== 1) throw new ClaimError('INVITATION_CLOSED', 'This invitation was already accepted or revoked')
  await recordClaimEventSafe(prisma, inv.claimRequestId, 'INVITATION_REVOKED', { actorUserId, data: { invitationId } })
}
