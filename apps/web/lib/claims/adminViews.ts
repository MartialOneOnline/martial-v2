import { prisma } from '@/lib/db'
import { findCandidateSchools } from './candidates'
import { SAME_KEY_RETRY_WINDOW_MS, invitationState, isInvitationOpen, nextStep, type InvitationState, type RequestStatus } from './status'
import { schoolOwnerIds } from './invitations'
import { CLAIM_VIEW_WHERE, claimQueueCounts, type ClaimView } from './queue'

// Read models for the super-admin pages. Contact details of requesters only
// ever leave the server through these (guarded) admin routes.

export type ListView = ClaimView

const invitationSelect = {
  id: true, status: true, deliveryStatus: true, deliveryStartedAt: true, deliveryKeyAt: true, expiresAt: true, usedAt: true, revokedAt: true,
  isActive: true, sentToEmail: true, email: true, sentAt: true, openedAt: true, registeredAt: true, deliveryError: true,
  providerMessageId: true, deliveryAttempt: true, createdAt: true, claimRequestId: true, schoolId: true, acceptedUserId: true,
} as const

type InvRow = { status: string; deliveryStatus: string | null; deliveryStartedAt: Date | null; expiresAt: Date | null; usedAt: Date | null; revokedAt: Date | null; isActive: boolean }

function latestState(invs: InvRow[]): InvitationState | null {
  const first = invs[0]
  return first ? invitationState(first) : null
}

export async function listClaimRequests(view: ListView, q: string) {
  const query = q.trim()
  const where: Record<string, unknown> = { ...(CLAIM_VIEW_WHERE[view] ?? CLAIM_VIEW_WHERE.pending) }
  if (query) {
    where.OR = [
      { schoolName: { contains: query, mode: 'insensitive' } },
      { city: { contains: query, mode: 'insensitive' } },
      { contactName: { contains: query, mode: 'insensitive' } },
      { contactEmail: { contains: query, mode: 'insensitive' } },
      { school: { name: { contains: query, mode: 'insensitive' } } },
    ]
  }
  const [rows, counts] = await Promise.all([
    prisma.claimRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        school: { select: { id: true, name: true, status: true } },
        invitations: { orderBy: { createdAt: 'desc' }, take: 1, select: invitationSelect },
      },
    }),
    claimQueueCounts(prisma),
  ])
  return {
    counts,
    requests: rows.map(r => ({
      id: r.id, status: r.status, schoolName: r.schoolName, city: r.city, contactName: r.contactName, contactEmail: r.contactEmail,
      createdAt: r.createdAt, resolvedAt: r.resolvedAt, completedAt: r.completedAt, rejectReason: r.rejectReason,
      school: r.school, invitationState: latestState(r.invitations),
      needsAssociationReview: r.status === 'RESOLVED' && !r.schoolId,
    })),
  }
}

export async function claimRequestDetail(id: string) {
  const r = await prisma.claimRequest.findUnique({
    where: { id },
    include: {
      school: { select: { id: true, name: true, slug: true, status: true, city: true, country: true, email: true } },
      sourceSchool: { select: { id: true, name: true, slug: true, city: true } },
      invitations: { orderBy: { createdAt: 'desc' }, select: invitationSelect },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!r) return null

  const actorIds = [...new Set([...r.events.map(e => e.actorUserId), r.linkedById, r.completedUserId].filter((v): v is string => !!v))]
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : []
  const actorName = (uid: string | null) => {
    if (!uid) return null
    const a = actors.find(x => x.id === uid)
    return a ? (a.name || a.email) : uid
  }

  const ownerIds = r.school ? await schoolOwnerIds(prisma, r.school.id) : []
  const owners = ownerIds.length
    ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true } })
    : []

  const now = Date.now()
  const invitations = r.invitations.map(i => ({
    ...i, state: invitationState(i, now), open: isInvitationOpen(i),
    retryWindowPassed: !i.deliveryKeyAt || now - i.deliveryKeyAt.getTime() > SAME_KEY_RETRY_WINDOW_MS,
  }))
  const status = r.status as RequestStatus
  const candidates = status === 'PENDING' || status === 'RESOLVED' || status === 'DISMISSED'
    ? await findCandidateSchools({ schoolName: r.schoolName, city: r.city, contactEmail: r.contactEmail, sourceSchoolId: r.sourceSchoolId })
    : []

  return {
    request: {
      id: r.id, status, schoolName: r.schoolName, city: r.city, contactName: r.contactName, contactEmail: r.contactEmail,
      phone: r.phone, message: r.message, locale: r.locale, createdAt: r.createdAt, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt,
      rejectReason: r.rejectReason, linkedAt: r.linkedAt, linkedBy: actorName(r.linkedById), completedAt: r.completedAt,
      completedBy: actorName(r.completedUserId), needsAssociationReview: status === 'RESOLVED' && !r.schoolId,
    },
    school: r.school ? { ...r.school, owners } : null,
    sourceSchool: r.sourceSchool,
    invitations,
    events: r.events.map(e => ({ id: e.id, type: e.type, createdAt: e.createdAt, actor: actorName(e.actorUserId), data: e.data })),
    candidates,
    nextStep: nextStep({
      status, hasSchool: Boolean(r.school), schoolHasOwner: ownerIds.length > 0,
      invitation: invitations.find(i => i.open)?.state ?? invitations[0]?.state ?? null,
    }),
  }
}

// For the school's admin page: every request and invitation tied to it.
export async function schoolOwnershipHistory(schoolId: string) {
  const [requests, invitations] = await Promise.all([
    prisma.claimRequest.findMany({
      where: { OR: [{ schoolId }, { sourceSchoolId: schoolId }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, schoolName: true, contactName: true, contactEmail: true, createdAt: true, schoolId: true },
    }),
    prisma.schoolInvitation.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' }, select: invitationSelect }),
  ])
  return {
    requests: requests.map(r => ({ ...r, linked: r.schoolId === schoolId })),
    invitations: invitations.map(i => ({ id: i.id, recipient: i.sentToEmail ?? i.email, state: invitationState(i), createdAt: i.createdAt, claimRequestId: i.claimRequestId })),
  }
}
