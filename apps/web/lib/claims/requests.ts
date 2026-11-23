import { prisma } from '@/lib/db'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildAdminClaimNotice, buildClaimReceivedEmail, claimLang } from '@/lib/email/templates/claimEmails'
import { ClaimError } from './errors'
import { recordClaimEvent, recordClaimEventSafe } from './events'
import { findCandidateSchools } from './candidates'
import { isValidEmail, normalizeEmail } from './token'
import { isInvitationOpen } from './status'
import { lockSchool, schoolOwnerIds } from './invitations'

const DEFAULT_ADMIN_EMAIL = 'support@martialapp.com'

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// ── Public submission ────────────────────────────────────────────────────────

export type SubmitInput = {
  schoolName?: unknown; city?: unknown; contactName?: unknown; contactEmail?: unknown
  phone?: unknown; message?: unknown; schoolSlug?: unknown; locale?: unknown
}

export async function submitClaimRequest(body: SubmitInput): Promise<{ id: string }> {
  const contactName = clip(body.contactName, 120)
  const contactEmail = normalizeEmail(clip(body.contactEmail, 254))
  const phone = clip(body.phone, 40) || null
  const city = clip(body.city, 120) || null
  const message = clip(body.message, 2000) || null
  const locale = claimLang(clip(body.locale, 5))
  let schoolName = clip(body.schoolName, 160)

  // A request started from a school page keeps a reference to that school —
  // validated here, never trusted as proof of anything.
  let sourceSchool: { id: string; name: string } | null = null
  const slug = clip(body.schoolSlug, 200)
  if (slug) {
    sourceSchool = await prisma.school.findFirst({
      where: { slug, status: { notIn: ['SUSPENDED', 'ARCHIVED'] } },
      select: { id: true, name: true },
    })
    if (sourceSchool && !schoolName) schoolName = sourceSchool.name
  }

  if (!schoolName) throw new ClaimError('INVALID_INPUT', 'schoolName is required')
  if (!contactName) throw new ClaimError('INVALID_INPUT', 'contactName is required')
  if (!contactEmail || !isValidEmail(contactEmail)) throw new ClaimError('INVALID_INPUT', 'A valid contactEmail is required')

  // Persist first: the request must exist even if every email below fails.
  const request = await prisma.claimRequest.create({
    data: { schoolName, city, contactName, contactEmail, phone, message, locale, sourceSchoolId: sourceSchool?.id ?? null },
  })
  await recordClaimEventSafe(prisma, request.id, 'SUBMITTED', { data: { sourceSchoolId: sourceSchool?.id ?? null } })

  // Best-effort notices. Failures are recorded on the request, never thrown.
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
    const notice = buildAdminClaimNotice({
      schoolName, city, contactName, contactEmail, phone, message,
      sourceSchoolName: sourceSchool?.name ?? null,
      detailUrl: `${APP_URL}/admin/claims/${request.id}`,
    })
    const { error } = await getResend().emails.send(
      { from: FROM, to: settings?.superAdminEmail || DEFAULT_ADMIN_EMAIL, replyTo: contactEmail, subject: notice.subject, html: notice.html },
      { idempotencyKey: `claim-request-admin/${request.id}` },
    )
    if (error) throw new Error(`${error.name}: ${error.message}`)
  } catch (err) {
    console.error('[claim request] admin notice failed (request is saved):', err)
    await recordClaimEventSafe(prisma, request.id, 'ADMIN_NOTIFY_FAILED', { data: { error: err instanceof Error ? err.message : String(err) } })
  }
  try {
    const ack = buildClaimReceivedEmail({ lang: locale, contactName, schoolName })
    await getResend().emails.send(
      { from: FROM, to: contactEmail, subject: ack.subject, html: ack.html },
      { idempotencyKey: `claim-request-ack/${request.id}` },
    )
  } catch (err) {
    console.error('[claim request] requester acknowledgement failed:', err)
  }
  return { id: request.id }
}

// ── Admin decisions ──────────────────────────────────────────────────────────

async function loadRequest(id: string) {
  const request = await prisma.claimRequest.findUnique({ where: { id } })
  if (!request) throw new ClaimError('NOT_FOUND', 'Request not found')
  return request
}

async function openInvitationsFor(requestId: string) {
  const rows = await prisma.schoolInvitation.findMany({ where: { claimRequestId: requestId } })
  return rows.filter(isInvitationOpen)
}

export async function linkSchool(requestId: string, schoolId: string, actorUserId: string): Promise<void> {
  const request = await loadRequest(requestId)
  if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
    throw new ClaimError('INVALID_TRANSITION', 'Reopen the request before linking a school')
  }
  if (request.schoolId === schoolId) return // idempotent
  if ((await openInvitationsFor(requestId)).length > 0) {
    throw new ClaimError('ACTIVE_INVITATION_EXISTS', 'Revoke the open invitation before changing the linked school')
  }
  await prisma.$transaction(async tx => {
    const school = await lockSchool(tx, schoolId)
    if (!school) throw new ClaimError('NOT_FOUND', 'School not found')
    const owners = await schoolOwnerIds(tx, schoolId)
    const res = await tx.claimRequest.updateMany({
      where: { id: requestId, status: request.status, schoolId: request.schoolId },
      data: { schoolId, status: 'IN_PROGRESS', linkedById: actorUserId, linkedAt: new Date() },
    })
    if (res.count !== 1) throw new ClaimError('CHANGED_CONCURRENTLY', 'The request changed meanwhile. Refresh and try again.')
    await recordClaimEvent(tx, requestId, 'SCHOOL_LINKED', {
      actorUserId,
      data: { schoolId, schoolName: school.name, schoolStatus: school.status, previousSchoolId: request.schoolId, schoolHasOwner: owners.length > 0 },
    })
  })
}

export async function unlinkSchool(requestId: string, actorUserId: string): Promise<void> {
  const request = await loadRequest(requestId)
  if (request.status !== 'IN_PROGRESS' || !request.schoolId) throw new ClaimError('INVALID_TRANSITION', 'No linked school to remove')
  if ((await openInvitationsFor(requestId)).length > 0) {
    throw new ClaimError('ACTIVE_INVITATION_EXISTS', 'Revoke the open invitation before unlinking the school')
  }
  const res = await prisma.claimRequest.updateMany({
    where: { id: requestId, status: 'IN_PROGRESS', schoolId: request.schoolId },
    data: { schoolId: null, status: 'PENDING', linkedById: null, linkedAt: null },
  })
  if (res.count !== 1) throw new ClaimError('CHANGED_CONCURRENTLY', 'The request changed meanwhile. Refresh and try again.')
  await recordClaimEventSafe(prisma, requestId, 'SCHOOL_UNLINKED', { actorUserId, data: { schoolId: request.schoolId } })
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80) || 'school'
}

export const DUPLICATE_SCORE = 40

// Explicit creation after reviewing candidates. The new school takes only the
// fields the admin confirmed; the request's original text is kept untouched
// on the request. School.email is NOT set to the requester's email.
export async function createSchoolForRequest(
  requestId: string,
  input: { name?: unknown; city?: unknown; country?: unknown; acknowledgedDuplicates?: unknown },
  actorUserId: string,
): Promise<{ schoolId: string }> {
  const request = await loadRequest(requestId)
  if (request.status !== 'PENDING') throw new ClaimError('INVALID_TRANSITION', request.status === 'IN_PROGRESS' ? 'This request already has a linked school' : 'Reopen the request first')
  const name = clip(input.name, 160)
  const city = clip(input.city, 120) || null
  const country = clip(input.country, 2).toUpperCase() || null
  if (!name) throw new ClaimError('INVALID_INPUT', 'School name is required')
  if (country && !/^[A-Z]{2}$/.test(country)) throw new ClaimError('INVALID_INPUT', 'Country must be a 2-letter code')

  const candidates = (await findCandidateSchools({ schoolName: name, city, contactEmail: request.contactEmail, sourceSchoolId: request.sourceSchoolId }))
    .filter(c => c.score >= DUPLICATE_SCORE)
  const acknowledged = new Set(Array.isArray(input.acknowledgedDuplicates) ? input.acknowledgedDuplicates.filter((v): v is string => typeof v === 'string') : [])
  const unacknowledged = candidates.filter(c => !acknowledged.has(c.id))
  if (unacknowledged.length > 0) {
    throw new ClaimError('POSSIBLE_DUPLICATES', 'Possible duplicates found — review them before creating a new school', { candidates: unacknowledged })
  }

  const base = slugify(`${name} ${city ?? ''}`)
  let slug = base
  for (let i = 2; await prisma.school.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`

  return prisma.$transaction(async tx => {
    const res = await tx.claimRequest.updateMany({ where: { id: requestId, status: 'PENDING', schoolId: null }, data: { status: 'IN_PROGRESS' } })
    if (res.count !== 1) throw new ClaimError('CHANGED_CONCURRENTLY', 'The request changed meanwhile. Refresh and try again.')
    const school = await tx.school.create({
      data: { name, slug, city, country, status: 'UNVERIFIED', source: 'MANUAL' },
      select: { id: true, name: true },
    })
    await tx.claimRequest.update({ where: { id: requestId }, data: { schoolId: school.id, linkedById: actorUserId, linkedAt: new Date() } })
    await recordClaimEvent(tx, requestId, 'SCHOOL_CREATED', {
      actorUserId,
      data: { schoolId: school.id, schoolName: school.name, city, country, reviewedCandidates: [...acknowledged] },
    })
    return { schoolId: school.id }
  })
}

export async function rejectRequest(requestId: string, reason: unknown, actorUserId: string): Promise<void> {
  const text = clip(reason, 1000)
  if (!text) throw new ClaimError('INVALID_INPUT', 'Give a reason for rejecting the request')
  const request = await loadRequest(requestId)
  if (!['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(request.status)) {
    throw new ClaimError('INVALID_TRANSITION', request.status === 'COMPLETED' ? 'Access was already granted — this request can no longer be rejected' : 'Already rejected')
  }
  await prisma.$transaction(async tx => {
    const res = await tx.claimRequest.updateMany({
      where: { id: requestId, status: request.status },
      data: { status: 'DISMISSED', rejectReason: text, resolvedAt: new Date() },
    })
    if (res.count !== 1) throw new ClaimError('CHANGED_CONCURRENTLY', 'The request changed meanwhile. Refresh and try again.')
    // An invitation still out for this request must stop working.
    const revoked = await tx.schoolInvitation.updateMany({
      where: { claimRequestId: requestId, usedAt: null, revokedAt: null, status: { not: 'REGISTERED' } },
      data: { revokedAt: new Date(), isActive: false },
    })
    await recordClaimEvent(tx, requestId, 'REJECTED', { actorUserId, data: { reason: text, previousStatus: request.status, revokedInvitations: revoked.count } })
  })
}

export async function reopenRequest(requestId: string, actorUserId: string): Promise<void> {
  const request = await loadRequest(requestId)
  if (request.status !== 'DISMISSED' && request.status !== 'RESOLVED') {
    throw new ClaimError('INVALID_TRANSITION', 'Only rejected or legacy-closed requests can be reopened')
  }
  const next = request.schoolId ? 'IN_PROGRESS' : 'PENDING'
  const res = await prisma.claimRequest.updateMany({
    where: { id: requestId, status: request.status },
    data: { status: next, resolvedAt: null },
  })
  if (res.count !== 1) throw new ClaimError('CHANGED_CONCURRENTLY', 'The request changed meanwhile. Refresh and try again.')
  await recordClaimEventSafe(prisma, requestId, 'REOPENED', { actorUserId, data: { previousStatus: request.status, rejectReason: request.rejectReason } })
}
