import { prisma } from '@/lib/db'
import { recordClaimEvent, recordClaimEventSafe } from './events'
import { hashInvitationToken, normalizeEmail } from './token'
import { lockClaimRequest, lockSchool, schoolOwnerIds } from './invitations'

// Public side of the owner invitation: /claim/[token].
//
// GET only reads (and marks OPENED). Acceptance requires a Supabase session
// for exactly the invited address with a confirmed email — proven either by
// an existing login or by the signed link POST /verify emails to that inbox.
// Nothing here overwrites a password, an existing identity link or a global
// role; OWNER is granted only on the school the invitation is linked to.

const UNCLAIMABLE = ['SUSPENDED', 'ARCHIVED']

export type TokenRejection = 'NOT_FOUND' | 'USED' | 'REVOKED' | 'EXPIRED' | 'NOT_SENT' | 'SCHOOL_NOT_CLAIMABLE' | 'LEGACY_LINK' | 'LEGACY_USED'

// Emails sent before 2026-11 linked to /claim/<invitation id> (a cuid). Those
// links granted access on their own and no longer work; a person arriving with
// one gets an explanation and a way forward instead of a bare "invalid link".
const LEGACY_ID = /^c[a-z0-9]{20,32}$/

async function findByToken(rawToken: string) {
  if (!rawToken || rawToken.length > 200) return null
  return prisma.schoolInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(rawToken) },
    include: {
      school: { select: { id: true, name: true, slug: true, city: true, country: true, logoUrl: true, status: true } },
      claimRequest: { select: { id: true, locale: true } },
    },
  })
}

export type ResolvedInvitation = NonNullable<Awaited<ReturnType<typeof findByToken>>>

type Checkable = {
  usedAt: Date | null; status: string; revokedAt: Date | null; isActive: boolean
  deliveryStatus: string | null; expiresAt: Date | null; school: { status: string } | null
}

export function rejectionFor(inv: Checkable, now = new Date()): TokenRejection | null {
  if (inv.usedAt || inv.status === 'REGISTERED') return 'USED'
  if (inv.revokedAt || !inv.isActive || inv.status === 'DECLINED') return 'REVOKED'
  // A token whose email was never handed to Resend was never seen by anyone.
  if (!inv.deliveryStatus || inv.deliveryStatus === 'PREPARED' || inv.deliveryStatus === 'FAILED') return 'NOT_SENT'
  if (!inv.expiresAt || inv.expiresAt <= now) return 'EXPIRED'
  if (inv.school && UNCLAIMABLE.includes(inv.school.status)) return 'SCHOOL_NOT_CLAIMABLE'
  return null
}

export async function resolveToken(rawToken: string): Promise<{ ok: true; invitation: ResolvedInvitation } | { ok: false; reason: TokenRejection; invitation: ResolvedInvitation | null }> {
  const invitation = await findByToken(rawToken)
  if (!invitation) return { ok: false, reason: await legacyReason(rawToken), invitation: null }
  const reason = rejectionFor(invitation)
  return reason ? { ok: false, reason, invitation } : { ok: true, invitation }
}

// Old-format link: say whether it was already used (→ sign in) or not (→ ask
// for a new invitation). Never grants anything; it only shapes the message.
async function legacyReason(raw: string): Promise<TokenRejection> {
  if (!LEGACY_ID.test(raw)) return 'NOT_FOUND'
  const old = await prisma.schoolInvitation.findUnique({
    where: { id: raw },
    select: { id: true, status: true, usedAt: true, claimRequestId: true },
  })
  if (!old) return 'NOT_FOUND'
  if (old.usedAt || old.status === 'REGISTERED') return 'LEGACY_USED'
  await recordClaimEventSafe(prisma, old.claimRequestId, 'LEGACY_LINK_OPENED', { data: { invitationId: old.id } })
  return 'LEGACY_LINK'
}

export async function markOpened(inv: ResolvedInvitation): Promise<void> {
  if (inv.status !== 'SENT' && inv.status !== 'PENDING') return
  const res = await prisma.schoolInvitation.updateMany({
    where: { id: inv.id, status: { in: ['SENT', 'PENDING'] }, usedAt: null, revokedAt: null },
    data: { status: 'OPENED', openedAt: new Date() },
  })
  if (res.count === 1) await recordClaimEventSafe(prisma, inv.claimRequestId, 'INVITATION_OPENED', { data: { invitationId: inv.id } })
}

// ── Acceptance ───────────────────────────────────────────────────────────────

export type AuthIdentity = { id: string; email: string | null | undefined; emailConfirmedAt: string | null | undefined }

export type AcceptResult =
  | { ok: true; schoolId: string; already: boolean }
  | { ok: false; code: 'INVALID_LINK'; reason: TokenRejection }
  | { ok: false; code: 'NOT_AUTHENTICATED' | 'EMAIL_NOT_CONFIRMED' | 'WRONG_ACCOUNT' | 'ACCOUNT_CONFLICT' | 'ACCOUNT_DELETED' | 'OWNER_CONFLICT' | 'ALREADY_USED' }

class Abort extends Error { constructor(readonly result: AcceptResult) { super(result.ok ? 'ok' : result.code) } }

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'school'
}

export async function acceptInvitation(rawToken: string, auth: AuthIdentity | null): Promise<AcceptResult> {
  if (!auth?.email) return { ok: false, code: 'NOT_AUTHENTICATED' }

  const found = await findByToken(rawToken)
  if (!found) return { ok: false, code: 'INVALID_LINK', reason: 'NOT_FOUND' }
  const expected = normalizeEmail(found.sentToEmail ?? '')
  const authEmail = normalizeEmail(auth.email)

  // Repeated acceptance by the same person (double click, refresh, retry
  // after a lost response): report success without doing anything again.
  if (found.usedAt && found.acceptedUserId) {
    const me = await prisma.user.findFirst({ where: { supabaseAuthId: auth.id }, select: { id: true } })
    if (me && me.id === found.acceptedUserId && found.schoolId) return { ok: true, schoolId: found.schoolId, already: true }
    return { ok: false, code: 'ALREADY_USED' }
  }
  const rejection = rejectionFor(found)
  if (rejection) return { ok: false, code: 'INVALID_LINK', reason: rejection }

  if (!expected || authEmail !== expected) return { ok: false, code: 'WRONG_ACCOUNT' }
  if (!auth.emailConfirmedAt) return { ok: false, code: 'EMAIL_NOT_CONFIRMED' }

  try {
    return await prisma.$transaction(async tx => {
      // First, one acceptance at a time per Auth identity (transaction-scoped
      // advisory lock, taken before any row lock and by nothing else, so it
      // cannot be part of a lock cycle). The same person accepting two
      // schools at once — two tabs — otherwise raced on creating or updating
      // the same user row (unique violation or a FOR SHARE → UPDATE deadlock).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`claim-accept:${auth.id}`}, 0))`
      // Row locks, always in this order (invitation, then school): concurrent
      // acceptances of the same invitation run one after the other, and
      // admin preparation for the same school waits for us.
      await tx.$queryRaw`SELECT id FROM school_invitations WHERE id = ${found.id} FOR UPDATE`
      if (found.schoolId) await lockSchool(tx, found.schoolId)
      // Re-read under the lock: the state may have changed since findByToken.
      const inv = await tx.schoolInvitation.findUnique({ where: { id: found.id }, include: { school: { select: { id: true, name: true, status: true } } } })
      if (!inv) throw new Abort({ ok: false, code: 'INVALID_LINK', reason: 'NOT_FOUND' })
      if (inv.usedAt) {
        // The other request of a double click won: same person → success.
        const me = await tx.user.findFirst({ where: { supabaseAuthId: auth.id }, select: { id: true } })
        if (me && me.id === inv.acceptedUserId && inv.schoolId) return { ok: true as const, schoolId: inv.schoolId, already: true }
        throw new Abort({ ok: false, code: 'ALREADY_USED' })
      }
      if (inv.tokenHash !== hashInvitationToken(rawToken)) throw new Abort({ ok: false, code: 'INVALID_LINK', reason: 'REVOKED' })
      const again = rejectionFor(inv)
      if (again) throw new Abort({ ok: false, code: 'INVALID_LINK', reason: again })
      // An invitation answering an ownership request is only valid while that
      // request is in progress and linked to this school. Locked (after
      // invitation and school, same order as rejectRequest) so a rejection
      // cannot slip in between this check and the grant.
      if (inv.claimRequestId) {
        const request = await lockClaimRequest(tx, inv.claimRequestId)
        if (!request || request.status !== 'IN_PROGRESS' || request.schoolId !== inv.schoolId) {
          throw new Abort({ ok: false, code: 'INVALID_LINK', reason: 'REVOKED' })
        }
      }

      // Identity: never re-point a Prisma user that is linked to a different
      // Auth account, never touch passwords or global roles.
      let user = await tx.user.findFirst({ where: { supabaseAuthId: auth.id }, select: { id: true, email: true, deletedAt: true } })
      if (!user) {
        const byEmail = await tx.user.findFirst({ where: { email: { equals: expected, mode: 'insensitive' } }, select: { id: true, email: true, supabaseAuthId: true, deletedAt: true } })
        if (byEmail?.supabaseAuthId && byEmail.supabaseAuthId !== auth.id) {
          throw new Abort({ ok: false, code: 'ACCOUNT_CONFLICT' })
        }
        if (byEmail) {
          const linked = await tx.user.updateMany({ where: { id: byEmail.id, supabaseAuthId: null }, data: { supabaseAuthId: auth.id } })
          if (linked.count !== 1) throw new Abort({ ok: false, code: 'ACCOUNT_CONFLICT' })
          user = { id: byEmail.id, email: byEmail.email, deletedAt: byEmail.deletedAt }
        } else {
          user = await tx.user.create({
            data: { supabaseAuthId: auth.id, email: expected, name: inv.name, role: 'SCHOOL_OWNER' },
            select: { id: true, email: true, deletedAt: true },
          })
        }
      }
      // A deleted (anonymized) or merged-away account is rejected by every
      // authenticated route (resolveDbUser), so granting it OWNER would burn
      // the invitation for nothing. Checked under a write lock (the row is
      // updated right below; a share lock would have to be upgraded, which
      // deadlocks against another holder), so a deletion committing meanwhile
      // is seen, and before anything is written.
      const live = await tx.$queryRaw<{ deletedAt: Date | null }[]>`SELECT "deletedAt" FROM users WHERE id = ${user.id} FOR UPDATE`
      if (user.deletedAt || live[0]?.deletedAt) throw new Abort({ ok: false, code: 'ACCOUNT_DELETED' })

      // Keep the global role consistent with /onboarding/school (owners show
      // up in Admin → School Owners). Only ever raised from STUDENT or
      // INSTRUCTOR — never lowered, never to SUPERADMIN. It grants nothing by
      // itself: dashboard access comes from the SchoolMember row below.
      await tx.user.updateMany({ where: { id: user.id, role: { in: ['STUDENT', 'INSTRUCTOR'] } }, data: { role: 'SCHOOL_OWNER' } })

      let schoolId = inv.schoolId
      if (schoolId) {
        const owners = await schoolOwnerIds(tx, schoolId)
        if (owners.some(id => id !== user!.id)) throw new Abort({ ok: false, code: 'OWNER_CONFLICT' })
      }

      const now = new Date()
      const consumed = await tx.schoolInvitation.updateMany({
        where: { id: inv.id, usedAt: null, revokedAt: null, isActive: true, tokenHash: inv.tokenHash },
        data: { usedAt: now, status: 'REGISTERED', registeredAt: now, acceptedUserId: user.id },
      })
      if (consumed.count !== 1) throw new Abort({ ok: false, code: 'ALREADY_USED' })

      if (!schoolId) {
        // Pipeline invitation without a school (Admin → Invitations): the
        // school is created once, here, as part of the single-use consume.
        const base = slugify(inv.name)
        let slug = base
        for (let i = 1; await tx.school.findFirst({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`
        const school = await tx.school.create({
          data: { name: inv.name, slug, city: inv.city, country: inv.country, website: inv.website, status: 'CLAIMED', source: 'SELF_REGISTERED', claimedById: user.id, claimedAt: now },
          select: { id: true },
        })
        schoolId = school.id
        await tx.schoolInvitation.update({ where: { id: inv.id }, data: { schoolId } })
      } else {
        await tx.school.updateMany({ where: { id: schoolId, claimedById: null }, data: { claimedById: user.id, claimedAt: now } })
        // UNVERIFIED → CLAIMED only. VERIFIED / PARTNER / UNDER_REVIEW keep
        // their verification; nothing gets published or verified here.
        await tx.school.updateMany({ where: { id: schoolId, status: 'UNVERIFIED' }, data: { status: 'CLAIMED' } })
      }

      await tx.schoolMember.upsert({
        where: { schoolId_userId: { schoolId, userId: user.id } },
        update: { role: 'OWNER', status: 'ACTIVE' },
        create: { schoolId, userId: user.id, role: 'OWNER', status: 'ACTIVE' },
      })
      await tx.userPreference.upsert({
        where: { userId: user.id },
        update: { lastSchoolId: schoolId, lastContextType: 'SCHOOL' },
        create: { userId: user.id, lastSchoolId: schoolId, lastContextType: 'SCHOOL' },
      })

      if (inv.claimRequestId) {
        const completed = await tx.claimRequest.updateMany({
          where: { id: inv.claimRequestId, status: 'IN_PROGRESS', schoolId },
          data: { status: 'COMPLETED', completedAt: now, completedUserId: user.id, resolvedAt: now },
        })
        // Locked and checked above; anything else means the request moved and
        // the whole grant is rolled back.
        if (completed.count !== 1) throw new Abort({ ok: false, code: 'INVALID_LINK', reason: 'REVOKED' })
        await recordClaimEvent(tx, inv.claimRequestId, 'ACCESS_GRANTED', {
          data: { invitationId: inv.id, schoolId, userId: user.id, email: expected, schoolStatusBefore: inv.school?.status ?? null },
        })
      }
      return { ok: true as const, schoolId, already: false }
    })
  } catch (err) {
    if (err instanceof Abort) {
      if (!err.result.ok && (err.result.code === 'OWNER_CONFLICT' || err.result.code === 'ACCOUNT_CONFLICT' || err.result.code === 'ACCOUNT_DELETED')) {
        await recordClaimEventSafe(prisma, found.claimRequestId, err.result.code === 'OWNER_CONFLICT' ? 'OWNER_CONFLICT' : 'IDENTITY_CONFLICT', {
          data: { invitationId: found.id, at: 'accept', authUserId: auth.id, ...(err.result.code === 'ACCOUNT_DELETED' ? { reason: 'account_deleted' } : {}) },
        })
      }
      return err.result
    }
    throw err
  }
}
