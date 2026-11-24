import type { prisma as Prisma } from '@/lib/db'
import { invitationState, isInvitationOpen } from './status'

// One definition of every super-admin queue/counter. The dashboard counters,
// the Verification Queue tabs and their lists all read these, so a number on
// the dashboard is always the length of the list its link opens.

type Db = typeof Prisma

// ── Ownership requests ───────────────────────────────────────────────────────

export type ClaimView = 'pending' | 'in_progress' | 'legacy' | 'history' | 'all'

export const CLAIM_VIEW_WHERE: Record<ClaimView, Record<string, unknown>> = {
  // Waiting on a super admin: review, link or create the school.
  pending: { status: 'PENDING' },
  // School linked; invitation being sent / waiting for the invitee.
  in_progress: { status: 'IN_PROGRESS' },
  // Closed with the old "Mark resolved" before any school was linked: nobody
  // reviewed the association (the 2026-11-22 incident). Also part of history.
  legacy: { status: 'RESOLVED', schoolId: null },
  history: { status: { in: ['COMPLETED', 'DISMISSED', 'RESOLVED'] } },
  all: {},
}

export function isClaimView(v: string | null | undefined): v is ClaimView {
  return !!v && v in CLAIM_VIEW_WHERE
}

export async function claimQueueCounts(db: Db) {
  const [pending, in_progress, legacy, history] = await Promise.all(
    (['pending', 'in_progress', 'legacy', 'history'] as const).map(v => db.claimRequest.count({ where: CLAIM_VIEW_WHERE[v] })),
  )
  return { pending, in_progress, legacy, history }
}

// ── Listing review (school profiles) ─────────────────────────────────────────

// UNDER_REVIEW = finished the Getting Started checklist; CLAIMED = has an
// owner who has not finished it. Both are listed in the "Listing review" tab.
export const LISTING_REVIEW_STATUSES = ['UNDER_REVIEW', 'CLAIMED'] as const

export async function listingReviewCounts(db: Db) {
  const rows = await db.school.groupBy({ by: ['status'], where: { status: { in: [...LISTING_REVIEW_STATUSES] } }, _count: { _all: true } })
  const n = (s: string) => rows.find(r => r.status === s)?._count._all ?? 0
  return { total: n('UNDER_REVIEW') + n('CLAIMED'), readyForReview: n('UNDER_REVIEW'), ownerNotFinished: n('CLAIMED') }
}

// ── Owner invitations ────────────────────────────────────────────────────────

export type InvitationIndicators = {
  total: number // every invitation row ever created
  sent: number // accepted by Resend at least once (sentAt set)
  accepted: number // the invitee accepted (owner access granted / legacy REGISTERED)
  acceptedThisMonth: number // accepted since the 1st of the current month, UTC
  awaitingAcceptance: number // open, delivered, link still valid
  needsAction: number // open but not working for the invitee: not sent, failed, unknown, expired, old-format link
  needsActionFromRequests: number // …of which answer an ownership request (listed under In progress)
  needsActionPipeline: number // …of which are direct/pipeline invites (listed in Admin → Schools)
  needsActionBreakdown: { notSent: number; failed: number; uncertain: number; expired: number; legacyLink: number }
  conversionRate: number // accepted / sent, all time, whole percent
}

export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function summarizeInvitations(rows: Array<Parameters<typeof invitationState>[0] & { sentAt: Date | null; registeredAt: Date | null; claimRequestId: string | null }>, now = new Date()): InvitationIndicators {
  const t = now.getTime()
  const monthStart = startOfMonthUtc(now).getTime()
  const b = { notSent: 0, failed: 0, uncertain: 0, expired: 0, legacyLink: 0 }
  let sent = 0, accepted = 0, acceptedThisMonth = 0, awaitingAcceptance = 0, fromRequests = 0
  for (const r of rows) {
    if (r.sentAt) sent++
    const state = invitationState(r, t)
    if (state === 'accepted') {
      accepted++
      const at = r.usedAt ?? r.registeredAt
      if (at && new Date(at).getTime() >= monthStart) acceptedThisMonth++
      continue
    }
    if (!isInvitationOpen(r)) continue
    if (state !== 'sent' && state !== 'opened' && r.claimRequestId) fromRequests++
    switch (state) {
      case 'sent': case 'opened': awaitingAcceptance++; break
      case 'prepared': case 'sending': b.notSent++; break
      case 'failed': b.failed++; break
      case 'uncertain': b.uncertain++; break
      case 'expired': b.expired++; break
      case 'legacy': b.legacyLink++; break
    }
  }
  const needsAction = b.notSent + b.failed + b.uncertain + b.expired + b.legacyLink
  return {
    total: rows.length, sent, accepted, acceptedThisMonth, awaitingAcceptance, needsAction, needsActionBreakdown: b,
    needsActionFromRequests: fromRequests, needsActionPipeline: needsAction - fromRequests,
    conversionRate: sent > 0 ? Math.round((accepted / sent) * 100) : 0,
  }
}

export async function invitationIndicators(db: Db, now = new Date()): Promise<InvitationIndicators> {
  const rows = await db.schoolInvitation.findMany({
    select: { status: true, deliveryStatus: true, deliveryStartedAt: true, expiresAt: true, usedAt: true, revokedAt: true, isActive: true, sentAt: true, registeredAt: true, claimRequestId: true },
  })
  return summarizeInvitations(rows, now)
}
