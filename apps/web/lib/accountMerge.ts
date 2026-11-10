import type { Prisma } from '@/lib/prisma-client/client'

// ─────────────────────────────────────────────────────────────────────────────
// Merge two User rows that belong to the same person (admin tool).
//
// Typical case: a student imported from V1 (real email, years of history)
// later signs in with Apple "Hide My Email" or a different Google address.
// resolveDbUser() can't match that login to the existing row, so a second
// User is created and the school ends up with the person twice.
//
// A merge moves everything from `merge` onto `keep`, then soft-deletes
// `merge` (placeholder email, deletedAt). A User row links to exactly one
// Supabase Auth user, so only one sign-in method survives: the other Auth
// user is banned and renamed, otherwise resolveDbUser()'s email fallback or
// OAuth auto-provisioning would recreate the duplicate on its next login.
//
// The whole merge runs inside one Prisma transaction that locks both rows
// first; inside it, Auth changes come first (each one read back), then the
// data moves. If anything fails after an Auth change, the transaction rolls
// back, the kept login still reaches its old row, and running the merge again
// is safe — it also unbans the kept login if an earlier attempt banned it.
// ─────────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient

export const MERGED_EMAIL_DOMAIN = 'merged.martialapp.invalid'
export const mergedPlaceholderEmail = (userId: string) => `merged+${userId}@${MERGED_EMAIL_DOMAIN}`

export function isRelayEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@privaterelay.appleid.com')
}

export type Side = 'keep' | 'merge'

// Every User reference in the schema, and how the merge handles it. The
// schema test (accountMergeCoverage.test.ts) fails if a new relation to User
// is added without being listed here — a forgotten column would either block
// nothing (data silently left on the dead row) or be lost.
export const USER_REFERENCES = {
  // Moved with a plain updateMany
  moved: [
    'Booking.bookedByUserId',
    'CampBooking.userId',
    'Campaign.createdByUserId',
    'CollectibleOwnership.ownerUserId',
    'CollectibleOwnership.createdBy',
    'CollectibleUnit.ownerUserId',
    'CurriculumLesson.createdById',
    'EventBooking.userId',
    'Grading.userId',
    'Grading.promotedById',
    'GradingTemplate.createdById',
    'ImpersonationLog.actorId',
    'ImpersonationLog.targetUserId',
    'Lead.convertedUserId',
    'LeadNote.authorId',
    'LimitedCollection.athleteUserId',
    'LoginHistory.userId',
    'Membership.userId',
    'Notification.recipientUserId',
    'Order.userId',
    'Review.userId',
    'School.claimedById',
    'SchoolClaim.userId',
    'SchoolClaim.reviewedBy',
    'SchoolInvitation.invitedById',
    'Transaction.userId',
    'Transaction.resolvedBy',
    'Transaction.deletedBy',
  ],
  // Unique constraints: keep's row wins, merge's duplicate is dropped/cancelled
  deduped: [
    'Booking.userId', // active (PENDING/CONFIRMED) same class+slot → merge's cancelled
    'SchoolMember.userId', // same school → combined into keep's row
    'ContentAccess.userId',
    'CurriculumLessonView.userId',
    'UserWaiver.userId',
    'UserPreference.userId',
    'Instructor.userId',
  ],
  // Dropped outright
  dropped: ['EmailChangeRequest.userId'],
} as const

// ── Pure rules ──────────────────────────────────────────────────────────────

const MEMBER_STATUS_RANK = ['ARCHIVED', 'INACTIVE', 'PENDING', 'LEAD', 'FROZEN', 'ACTIVE'] as const
const MEMBER_ROLE_RANK = ['STUDENT', 'CUSTOM', 'RECEPTIONIST', 'ASSISTANT_INSTRUCTOR', 'INSTRUCTOR', 'MANAGER', 'ADMIN', 'OWNER'] as const
const USER_ROLE_RANK = ['STUDENT', 'INSTRUCTOR', 'SCHOOL_OWNER', 'SUPERADMIN'] as const

const rank = (list: readonly string[], v: string) => list.indexOf(v)

export type MemberFields = {
  role: string
  customRoleId: string | null
  status: string
  joinedAt: Date | null
  belt: string | null
  beltRankId: string | null
  beltDegree: number | null
  beltDate: Date | null
  emergencyContact: string | null
  medicalNotes: string | null
  notes: string | null
}

// Both accounts are members of the same school: fold them into keep's row.
// Role and status are one unit — the row with the most "alive" status (then
// the higher role, then keep) gives role, custom role AND status together.
// Mixing them would let an INACTIVE owner's role ride on the other row's
// ACTIVE status and reactivate access neither account had.
// The belt moves as one block too (keep's if it has one).
export function combineMembers(keep: MemberFields, merge: MemberFields): MemberFields {
  const statusDiff = rank(MEMBER_STATUS_RANK, merge.status) - rank(MEMBER_STATUS_RANK, keep.status)
  const accessFrom = statusDiff > 0 || (statusDiff === 0 && rank(MEMBER_ROLE_RANK, merge.role) > rank(MEMBER_ROLE_RANK, keep.role))
    ? merge
    : keep
  const beltFrom = keep.belt || keep.beltRankId ? keep : merge.belt || merge.beltRankId ? merge : keep
  const joined = [keep.joinedAt, merge.joinedAt].filter((d): d is Date => !!d)
  const notes = [keep.notes, merge.notes]
    .map(n => n?.trim())
    .filter((n, i, all): n is string => !!n && all.indexOf(n) === i)
  return {
    role: accessFrom.role,
    customRoleId: accessFrom.customRoleId,
    status: accessFrom.status,
    joinedAt: joined.length ? new Date(Math.min(...joined.map(d => d.getTime()))) : null,
    belt: beltFrom.belt,
    beltRankId: beltFrom.beltRankId,
    beltDegree: beltFrom.beltDegree,
    beltDate: beltFrom.beltDate,
    emergencyContact: keep.emergencyContact || merge.emergencyContact,
    medicalNotes: keep.medicalNotes || merge.medicalNotes,
    notes: notes.length ? notes.join('\n') : null,
  }
}

export type ProfileFields = {
  name: string | null
  phone: string | null
  gender: string | null
  dateOfBirth: Date | null
  avatarUrl: string | null
  guardianName: string | null
  guardianContact: string | null
  guardianConsentAt: Date | null
  role: string
  schoolId: string | null
}

// Profile of the surviving row: keep's values, gaps filled from merge, and
// the higher platform role (a STUDENT row absorbing an instructor's account
// must not silently lose dashboard access).
export function combineProfile(keep: ProfileFields, merge: ProfileFields): ProfileFields {
  const roleFromMerge = rank(USER_ROLE_RANK, merge.role) > rank(USER_ROLE_RANK, keep.role)
  const guardianFrom = keep.guardianConsentAt || keep.guardianName ? keep : merge
  return {
    name: keep.name || merge.name,
    phone: keep.phone || merge.phone,
    gender: keep.gender ?? merge.gender,
    dateOfBirth: keep.dateOfBirth ?? merge.dateOfBirth,
    avatarUrl: keep.avatarUrl || merge.avatarUrl,
    guardianName: guardianFrom.guardianName,
    guardianContact: guardianFrom.guardianContact,
    guardianConsentAt: guardianFrom.guardianConsentAt,
    role: roleFromMerge ? merge.role : keep.role,
    schoolId: roleFromMerge ? merge.schoolId ?? keep.schoolId : keep.schoolId ?? merge.schoolId,
  }
}

type AccessFields = { isActive: boolean; revokedAt: Date | null; endDate: Date | null }

export function isLiveAccess(a: AccessFields, now: Date): boolean {
  return a.isActive && !a.revokedAt && (!a.endDate || a.endDate > now)
}

// Same platform on both accounts: the live grant wins; if both or neither
// are live, the one that lasts longer (no end date = open-ended); tie → keep.
export function pickContentAccess(keep: AccessFields, merge: AccessFields, now: Date): Side {
  const live = (a: AccessFields) => isLiveAccess(a, now)
  if (live(keep) !== live(merge)) return live(merge) ? 'merge' : 'keep'
  const end = (a: AccessFields) => (a.endDate ? a.endDate.getTime() : Number.POSITIVE_INFINITY)
  return end(merge) > end(keep) ? 'merge' : 'keep'
}

type ViewFields = { viewCount: number; firstViewedAt: Date; lastViewedAt: Date }

export function combineLessonViews(keep: ViewFields, merge: ViewFields): ViewFields {
  return {
    viewCount: keep.viewCount + merge.viewCount,
    firstViewedAt: keep.firstViewedAt < merge.firstViewedAt ? keep.firstViewedAt : merge.firstViewedAt,
    lastViewedAt: keep.lastViewedAt > merge.lastViewedAt ? keep.lastViewedAt : merge.lastViewedAt,
  }
}

// Same waiver on both accounts. Returns which row survives — the other one
// is deleted, so a signed row must never be the loser.
export function pickWaiver(keep: { signedAt: Date | null }, merge: { signedAt: Date | null }): Side | 'conflict' {
  if (keep.signedAt && merge.signedAt) return 'conflict'
  return merge.signedAt ? 'merge' : 'keep'
}

export type LoginInfo = { authId: string; email: string | null; providers: string[]; lastSignInAt: string | null }

export type SideSummary = {
  id: string
  name: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  role: string
  schoolId: string | null
  deletedAt: Date | null
  createdAt: Date
  supabaseAuthId: string | null
  activity: number // bookings + transactions + memberships, to suggest which row keeps
}

type WithLogin = SideSummary & { login: LoginInfo | null }

// For a given keep/merge order: keep the most recently used login, and a
// real email over an Apple relay one.
export function defaultSides(keep: WithLogin, merge: WithLogin): { loginFrom: Side; emailFrom: Side } {
  const lastUsed = (s: WithLogin) => (s.login?.lastSignInAt ? Date.parse(s.login.lastSignInAt) : -1)
  const loginFrom: Side = !keep.login ? 'merge' : !merge.login ? 'keep' : lastUsed(merge) > lastUsed(keep) ? 'merge' : 'keep'
  const emailFrom: Side = isRelayEmail(keep.email) && !isRelayEmail(merge.email) ? 'merge' : 'keep'
  return { loginFrom, emailFrom }
}

// The UI's starting point: keep the row with more history (older on a tie).
export function suggestDefaults(a: WithLogin, b: WithLogin) {
  const keepIsA = a.activity !== b.activity ? a.activity > b.activity : a.createdAt <= b.createdAt
  const keep = keepIsA ? a : b
  const merge = keepIsA ? b : a
  return { keepId: keep.id, mergeId: merge.id, ...defaultSides(keep, merge) }
}

export type MergeChoice = { keepId: string; mergeId: string; loginFrom: Side; emailFrom: Side }

// Reasons the merge can't run at all. Shared by preview and execution.
export function mergeBlockers(
  keep: SideSummary | null,
  merge: SideSummary | null,
  choice: Pick<MergeChoice, 'loginFrom'>,
  extra: { signedWaiverConflicts?: number } = {},
): string[] {
  if (!keep || !merge) return ['One of the accounts no longer exists.']
  const out: string[] = []
  if (keep.id === merge.id) out.push('Pick two different accounts.')
  if (keep.deletedAt || merge.deletedAt) out.push('One of the accounts is already deleted or merged.')
  if (keep.role === 'SUPERADMIN' || merge.role === 'SUPERADMIN') out.push('Super Admin accounts can’t be merged.')
  if (keep.schoolId && merge.schoolId && keep.schoolId !== merge.schoolId) {
    out.push('Both accounts are staff of different schools — fix that first.')
  }
  const loginSide = choice.loginFrom === 'keep' ? keep : merge
  const otherSide = choice.loginFrom === 'keep' ? merge : keep
  if (!loginSide.supabaseAuthId && otherSide.supabaseAuthId) {
    out.push('The account whose login you chose has no login — choose the other one.')
  }
  if (extra.signedWaiverConflicts) {
    out.push('Both accounts signed the same waiver. A signature can’t be thrown away — ask the school which one to keep, then remove the other before merging.')
  }
  return out
}

// ── Reads ───────────────────────────────────────────────────────────────────

const SUMMARY_SELECT = {
  id: true, name: true, email: true, phone: true, avatarUrl: true, role: true, schoolId: true,
  deletedAt: true, createdAt: true, supabaseAuthId: true,
  _count: { select: { bookings: true, transactions: true, memberships: true } },
} as const

export async function loadSummary(db: Tx, id: string): Promise<SideSummary | null> {
  const u = await db.user.findUnique({ where: { id }, select: SUMMARY_SELECT })
  if (!u) return null
  const { _count, ...rest } = u
  return { ...rest, activity: _count.bookings + _count.transactions + _count.memberships }
}

// Waivers signed on both accounts: the unique (waiverId, userId) row can keep
// only one signature, so these block the merge.
export async function signedWaiverConflicts(db: Tx, keepId: string, mergeId: string): Promise<number> {
  const [k, m] = await Promise.all([
    db.userWaiver.findMany({ where: { userId: keepId, signedAt: { not: null } }, select: { waiverId: true } }),
    db.userWaiver.findMany({ where: { userId: mergeId, signedAt: { not: null } }, select: { waiverId: true } }),
  ])
  const signed = new Set(k.map(w => w.waiverId))
  return m.filter(w => signed.has(w.waiverId)).length
}

// Detail shown side by side in the admin modal.
export async function loadSideDetail(db: Tx, id: string) {
  const [schools, memberships, counts] = await Promise.all([
    db.schoolMember.findMany({
      where: { userId: id },
      select: { schoolId: true, role: true, status: true, belt: true, beltDegree: true, school: { select: { name: true } } },
    }),
    db.membership.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, schoolId: true, planId: true, endDate: true, school: { select: { name: true } }, plan: { select: { name: true } } },
    }),
    db.user.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            bookings: true, transactions: true, memberships: true, gradings: true, eventBookings: true,
            orders: true, loginHistory: true, leads: true, userWaivers: true,
          },
        },
      },
    }),
  ])
  return {
    schools: schools.map(s => ({ schoolId: s.schoolId, schoolName: s.school.name, role: s.role, status: s.status, belt: s.belt, beltDegree: s.beltDegree })),
    memberships: memberships.map(m => ({ id: m.id, status: m.status, schoolId: m.schoolId, schoolName: m.school.name, planName: m.plan?.name ?? m.planId, endDate: m.endDate })),
    counts: counts?._count ?? {},
  }
}

type Detail = Awaited<ReturnType<typeof loadSideDetail>>

// Things the admin should know before confirming, not reasons to stop.
export function mergeWarnings(
  keep: SideSummary & { detail: Detail; login: LoginInfo | null },
  merge: SideSummary & { detail: Detail; login: LoginInfo | null },
  choice: MergeChoice,
  mergeSelfRequestLeads: number,
): string[] {
  const out: string[] = []
  const lost = choice.loginFrom === 'keep' ? merge.login : keep.login
  if (lost) {
    const how = lost.providers.length ? lost.providers.join(' + ') : 'email'
    out.push(`The ${how} login of ${lost.email ?? 'the other account'} will stop working.`)
  }
  const email = choice.emailFrom === 'keep' ? keep.email : merge.email
  const other = choice.emailFrom === 'keep' ? merge.email : keep.email
  if (isRelayEmail(email) && !isRelayEmail(other)) {
    out.push('The kept email is an Apple relay address — school emails may not reach this person.')
  }
  for (const k of keep.detail.memberships.filter(m => m.status === 'ACTIVE')) {
    const twin = merge.detail.memberships.find(m => m.status === 'ACTIVE' && m.schoolId === k.schoolId)
    if (twin) out.push(`Both accounts have an ACTIVE membership at ${k.schoolName} — after merging, cancel the one that isn’t real so it isn’t charged twice.`)
  }
  if (mergeSelfRequestLeads > 0) {
    out.push('The duplicate account joined via “Join this school”, so it counts as a converted lead in the school’s reports. That lead moves too — the school may want to delete it.')
  }
  return out
}

// ── Write ───────────────────────────────────────────────────────────────────

const ACTIVE_BOOKING = ['PENDING', 'CONFIRMED'] as const

const MEMBER_SELECT = {
  id: true, schoolId: true, role: true, customRoleId: true, status: true, joinedAt: true,
  belt: true, beltRankId: true, beltDegree: true, beltDate: true,
  emergencyContact: true, medicalNotes: true, notes: true,
} as const

const PROFILE_SELECT = {
  id: true, email: true, name: true, phone: true, gender: true, dateOfBirth: true, avatarUrl: true,
  guardianName: true, guardianContact: true, guardianConsentAt: true, role: true, schoolId: true,
  supabaseAuthId: true, deletedAt: true,
} as const

export type MergeTxInput = MergeChoice & {
  keptAuthId: string | null // Auth user the surviving row will point at
  actorId: string | null
  disabledAuth: { id: string; email: string | null }[]
}

export class MergeConflictError extends Error {}

// Everything on the database side, meant to run inside one transaction.
export async function mergeUsersInTx(tx: Tx, input: MergeTxInput): Promise<Record<string, number>> {
  const { keepId: K, mergeId: S } = input

  // Row locks: a second merge (or a login relinking supabaseAuthId) on either
  // account waits for this one and then sees the result.
  await tx.$queryRaw`SELECT id FROM users WHERE id IN (${K}, ${S}) FOR UPDATE`
  const [keep, merge] = await Promise.all([
    tx.user.findUnique({ where: { id: K }, select: PROFILE_SELECT }),
    tx.user.findUnique({ where: { id: S }, select: PROFILE_SELECT }),
  ])
  if (!keep || !merge || keep.deletedAt || merge.deletedAt) {
    throw new MergeConflictError('One of the accounts changed while merging — reload and try again.')
  }

  const moved: Record<string, number> = {}
  const add = (k: string, n: number) => { if (n) moved[k] = (moved[k] ?? 0) + n }

  // School memberships (unique per school) ------------------------------------
  const [keepMembers, mergeMembers] = await Promise.all([
    tx.schoolMember.findMany({ where: { userId: K }, select: MEMBER_SELECT }),
    tx.schoolMember.findMany({ where: { userId: S }, select: MEMBER_SELECT }),
  ])
  for (const m of mergeMembers) {
    const twin = keepMembers.find(k => k.schoolId === m.schoolId)
    if (!twin) {
      await tx.schoolMember.update({ where: { id: m.id }, data: { userId: K } })
      add('schoolMembers', 1)
      continue
    }
    const combined = combineMembers(twin as MemberFields, m as MemberFields)
    await tx.schoolMember.update({
      where: { id: twin.id },
      data: { ...combined, role: combined.role as never, status: combined.status as never },
    })
    // Campaign history follows the member; the cascade would otherwise delete it.
    const taken = await tx.campaignRecipient.findMany({ where: { schoolMemberId: twin.id }, select: { campaignId: true } })
    await tx.campaignRecipient.updateMany({
      where: { schoolMemberId: m.id, campaignId: { notIn: taken.map(t => t.campaignId) } },
      data: { schoolMemberId: twin.id },
    })
    await tx.schoolMember.delete({ where: { id: m.id } })
    add('schoolMembersCombined', 1)
  }

  // Bookings: the active-slot unique index forbids two live bookings of the
  // same class slot for one user. Those are the same visit booked twice.
  const [keepActive, mergeActive] = await Promise.all([
    tx.booking.findMany({ where: { userId: K, status: { in: [...ACTIVE_BOOKING] } }, select: { classId: true, scheduledAt: true } }),
    tx.booking.findMany({ where: { userId: S, status: { in: [...ACTIVE_BOOKING] } }, select: { id: true, classId: true, scheduledAt: true } }),
  ])
  const slotKey = (b: { classId: string; scheduledAt: Date }) => `${b.classId}|${b.scheduledAt.toISOString()}`
  const keepSlots = new Set(keepActive.map(slotKey))
  const doubleBooked = mergeActive.filter(b => keepSlots.has(slotKey(b))).map(b => b.id)
  if (doubleBooked.length) {
    await tx.booking.updateMany({ where: { id: { in: doubleBooked } }, data: { status: 'CANCELLED' } })
    add('bookingsCancelledAsDuplicate', doubleBooked.length)
  }
  add('bookings', (await tx.booking.updateMany({ where: { userId: S }, data: { userId: K } })).count)

  // Other unique-per-user rows ------------------------------------------------
  // Content access: one row per platform. The live grant wins (then the
  // longer one), so moving the memberships never strands a valid right.
  const now = new Date()
  const ACCESS_SELECT = { id: true, platformId: true, isActive: true, revokedAt: true, endDate: true } as const
  const [keepAccess, mergeAccess] = await Promise.all([
    tx.contentAccess.findMany({ where: { userId: K }, select: ACCESS_SELECT }),
    tx.contentAccess.findMany({ where: { userId: S }, select: ACCESS_SELECT }),
  ])
  for (const m of mergeAccess) {
    const k = keepAccess.find(a => a.platformId === m.platformId)
    if (!k) continue
    if (pickContentAccess(k, m, now) === 'merge') await tx.contentAccess.delete({ where: { id: k.id } })
    else await tx.contentAccess.delete({ where: { id: m.id } })
  }
  add('contentAccesses', (await tx.contentAccess.updateMany({ where: { userId: S }, data: { userId: K } })).count)

  // Lesson views: one row per lesson — add the counts together.
  const VIEW_SELECT = { id: true, lessonId: true, viewCount: true, firstViewedAt: true, lastViewedAt: true } as const
  const [keepViews, mergeViews] = await Promise.all([
    tx.curriculumLessonView.findMany({ where: { userId: K }, select: VIEW_SELECT }),
    tx.curriculumLessonView.findMany({ where: { userId: S }, select: VIEW_SELECT }),
  ])
  for (const m of mergeViews) {
    const k = keepViews.find(v => v.lessonId === m.lessonId)
    if (!k) continue
    await tx.curriculumLessonView.update({ where: { id: k.id }, data: combineLessonViews(k, m) })
    await tx.curriculumLessonView.delete({ where: { id: m.id } })
  }
  add('curriculumLessonViews', (await tx.curriculumLessonView.updateMany({ where: { userId: S }, data: { userId: K } })).count)

  // Waivers: one row per waiver. A signature is legal evidence and is never
  // deleted: the signed row wins over an unsigned one, and two signed rows
  // block the merge (checked by signedWaiverConflicts before Auth runs).
  const WAIVER_SELECT = { id: true, waiverId: true, signedAt: true } as const
  const [keepWaivers, mergeWaivers] = await Promise.all([
    tx.userWaiver.findMany({ where: { userId: K }, select: WAIVER_SELECT }),
    tx.userWaiver.findMany({ where: { userId: S }, select: WAIVER_SELECT }),
  ])
  for (const m of mergeWaivers) {
    const k = keepWaivers.find(w => w.waiverId === m.waiverId)
    if (!k) continue
    const pick = pickWaiver(k, m)
    if (pick === 'conflict') throw new MergeConflictError('Both accounts signed the same waiver — resolve that first.')
    await tx.userWaiver.delete({ where: { id: pick === 'merge' ? k.id : m.id } })
  }
  add('userWaivers', (await tx.userWaiver.updateMany({ where: { userId: S }, data: { userId: K } })).count)

  if (await tx.userPreference.findUnique({ where: { userId: K }, select: { id: true } })) {
    await tx.userPreference.deleteMany({ where: { userId: S } })
  } else {
    add('userPreference', (await tx.userPreference.updateMany({ where: { userId: S }, data: { userId: K } })).count)
  }

  if (await tx.instructor.findUnique({ where: { userId: K }, select: { id: true } })) {
    await tx.instructor.updateMany({ where: { userId: S }, data: { userId: null } })
  } else {
    add('instructor', (await tx.instructor.updateMany({ where: { userId: S }, data: { userId: K } })).count)
  }

  await tx.emailChangeRequest.deleteMany({ where: { userId: S } })

  // Plain moves ----------------------------------------------------------------
  const moves: [string, () => Promise<{ count: number }>][] = [
    ['bookingsBookedBy', () => tx.booking.updateMany({ where: { bookedByUserId: S }, data: { bookedByUserId: K } })],
    ['campBookings', () => tx.campBooking.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['campaigns', () => tx.campaign.updateMany({ where: { createdByUserId: S }, data: { createdByUserId: K } })],
    ['collectibleOwnerships', () => tx.collectibleOwnership.updateMany({ where: { ownerUserId: S }, data: { ownerUserId: K } })],
    ['collectibleOwnershipsCreated', () => tx.collectibleOwnership.updateMany({ where: { createdBy: S }, data: { createdBy: K } })],
    ['collectibleUnits', () => tx.collectibleUnit.updateMany({ where: { ownerUserId: S }, data: { ownerUserId: K } })],
    ['curriculumLessons', () => tx.curriculumLesson.updateMany({ where: { createdById: S }, data: { createdById: K } })],
    ['eventBookings', () => tx.eventBooking.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['gradings', () => tx.grading.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['gradingsGiven', () => tx.grading.updateMany({ where: { promotedById: S }, data: { promotedById: K } })],
    ['gradingTemplates', () => tx.gradingTemplate.updateMany({ where: { createdById: S }, data: { createdById: K } })],
    ['impersonationsAsActor', () => tx.impersonationLog.updateMany({ where: { actorId: S }, data: { actorId: K } })],
    ['impersonationsAsTarget', () => tx.impersonationLog.updateMany({ where: { targetUserId: S }, data: { targetUserId: K } })],
    ['leads', () => tx.lead.updateMany({ where: { convertedUserId: S }, data: { convertedUserId: K } })],
    ['leadNotes', () => tx.leadNote.updateMany({ where: { authorId: S }, data: { authorId: K } })],
    ['limitedCollections', () => tx.limitedCollection.updateMany({ where: { athleteUserId: S }, data: { athleteUserId: K } })],
    ['loginHistory', () => tx.loginHistory.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['memberships', () => tx.membership.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['notifications', () => tx.notification.updateMany({ where: { recipientUserId: S }, data: { recipientUserId: K } })],
    ['orders', () => tx.order.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['reviews', () => tx.review.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['schoolsClaimed', () => tx.school.updateMany({ where: { claimedById: S }, data: { claimedById: K } })],
    ['schoolClaims', () => tx.schoolClaim.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['schoolClaimsReviewed', () => tx.schoolClaim.updateMany({ where: { reviewedBy: S }, data: { reviewedBy: K } })],
    ['invitationsSent', () => tx.schoolInvitation.updateMany({ where: { invitedById: S }, data: { invitedById: K } })],
    ['transactions', () => tx.transaction.updateMany({ where: { userId: S }, data: { userId: K } })],
    ['transactionsResolved', () => tx.transaction.updateMany({ where: { resolvedBy: S }, data: { resolvedBy: K } })],
    ['transactionsDeleted', () => tx.transaction.updateMany({ where: { deletedBy: S }, data: { deletedBy: K } })],
  ]
  for (const [key, run] of moves) add(key, (await run()).count)

  // The two User rows ------------------------------------------------------------
  // Free merge's unique email + auth link first, then give keep its final
  // values: the unique indexes would reject the other order.
  const finalEmail = input.emailFrom === 'merge' ? merge.email : keep.email
  await tx.user.update({
    where: { id: S },
    data: { email: mergedPlaceholderEmail(S), supabaseAuthId: null, deletedAt: new Date() },
  })
  const profile = combineProfile(keep as ProfileFields, merge as ProfileFields)
  await tx.user.update({
    where: { id: K },
    data: {
      ...profile,
      gender: profile.gender as never,
      role: profile.role as never,
      email: finalEmail,
      supabaseAuthId: input.keptAuthId,
    },
  })

  await tx.accountMerge.create({
    data: {
      keptUserId: K,
      mergedUserId: S,
      mergedEmail: merge.email,
      mergedName: merge.name,
      actorId: input.actorId,
      keptAuthId: input.keptAuthId,
      disabledAuth: input.disabledAuth,
      moved,
    },
  })

  return moved
}

// ── Auth (Supabase) ─────────────────────────────────────────────────────────

export type AuthUser = { id: string; email: string | null; providers: string[]; lastSignInAt: string | null; bannedUntil: string | null }

// 'missing' only when Supabase confirmed the user doesn't exist; anything
// unclear (error, timeout, lost response) is 'error' and stops the merge.
export type AuthRead = { status: 'found'; user: AuthUser } | { status: 'missing' } | { status: 'error'; message: string }

// The slice of supabase.auth.admin the merge uses (injected for tests).
// Neither method throws.
export type AuthAdmin = {
  getUser(id: string): Promise<AuthRead>
  updateUser(id: string, attrs: { email?: string; email_confirm?: boolean; ban_duration?: string }): Promise<{ error: string | null }>
}

// Database side of one merge, used while both user rows are locked.
export type LockedPair = {
  load(id: string): Promise<SideSummary | null>
  signedWaiverConflicts(): Promise<number>
  applyDb(input: MergeTxInput): Promise<Record<string, number>>
}

export type MergeDeps = {
  auth: AuthAdmin
  // Runs fn inside one database transaction that first locks both user rows
  // (SELECT … FOR UPDATE) and holds them through the Auth calls, so two
  // merges touching the same account never overlap: the second waits, then
  // sees the first one's result (merged row → blocker) before touching Auth.
  withLockedPair<T>(keepId: string, mergeId: string, fn: (pair: LockedPair) => Promise<T>): Promise<T>
}

export type MergeResult =
  | { ok: true; moved: Record<string, number>; keptEmail: string; disabledAuth: { id: string; email: string | null }[] }
  | { ok: false; status: number; error: string }

// ~100 years: GoTrue has no "forever" (same value as account self-delete).
const BAN_FOREVER = '876000h'

export const isBanned = (u: AuthUser, now = Date.now()) => !!u.bannedUntil && Date.parse(u.bannedUntil) > now
const sameEmail = (a: string | null, b: string) => (a ?? '').toLowerCase() === b.toLowerCase()

export async function runAccountMerge(deps: MergeDeps, choice: MergeChoice, actorId: string | null): Promise<MergeResult> {
  const { auth } = deps
  return deps.withLockedPair(choice.keepId, choice.mergeId, async pair => {
    const [keep, merge] = await Promise.all([pair.load(choice.keepId), pair.load(choice.mergeId)])
    const blockers = mergeBlockers(keep, merge, choice, { signedWaiverConflicts: keep && merge ? await pair.signedWaiverConflicts() : 0 })
    if (blockers.length || !keep || !merge) return { ok: false, status: 409, error: blockers[0] ?? 'Cannot merge' }

    const winner = choice.loginFrom === 'keep' ? keep : merge
    const loser = choice.loginFrom === 'keep' ? merge : keep
    const finalEmail = choice.emailFrom === 'keep' ? keep.email : merge.email
    // mergeBlockers() guarantees: if the winner has no login, neither has the loser.
    const keptAuthId = winner.supabaseAuthId
    const retiredAuthId = loser.supabaseAuthId

    // 0. Read both logins before changing anything.
    const unclear = (r: AuthRead | null) => r?.status === 'error'
    const loserBefore = retiredAuthId ? await auth.getUser(retiredAuthId) : null
    const winnerBefore = keptAuthId ? await auth.getUser(keptAuthId) : null
    if (unclear(loserBefore) || unclear(winnerBefore)) {
      return { ok: false, status: 503, error: 'Supabase Auth didn’t answer clearly. Nothing changed — try again.' }
    }
    if (winnerBefore?.status === 'missing') {
      return { ok: false, status: 409, error: 'The chosen login no longer exists in Supabase Auth. Choose the other one.' }
    }

    // 1. Retire the other login: ban it and move it off its email, so that
    //    neither it nor an OAuth re-login can land on (or recreate) a row.
    //    The result is read back — a failed or lost answer never counts as done.
    const disabledAuth: { id: string; email: string | null }[] = []
    if (retiredAuthId && loserBefore?.status === 'found') {
      const placeholder = mergedPlaceholderEmail(loser.id)
      await auth.updateUser(retiredAuthId, { email: placeholder, email_confirm: true, ban_duration: BAN_FOREVER })
      const after = await auth.getUser(retiredAuthId)
      const retired = after.status === 'missing' || (after.status === 'found' && isBanned(after.user) && sameEmail(after.user.email, placeholder))
      if (!retired) {
        return { ok: false, status: 502, error: 'Couldn’t confirm the other login was disabled. Nothing in the database changed — run the merge again.' }
      }
      // On a rerun it already carries the placeholder; the original address is no longer known.
      const original = loserBefore.user.email
      disabledAuth.push({ id: retiredAuthId, email: original && !sameEmail(original, placeholder) ? original : null })
    } else if (retiredAuthId) {
      disabledAuth.push({ id: retiredAuthId, email: null }) // confirmed already gone
    }

    // 2. The kept login: kept email, and never banned — this also repairs an
    //    earlier attempt that kept the other login and failed halfway.
    if (keptAuthId && winnerBefore?.status === 'found') {
      const w = winnerBefore.user
      if (!sameEmail(w.email, finalEmail) || isBanned(w)) {
        await auth.updateUser(keptAuthId, {
          ...(sameEmail(w.email, finalEmail) ? {} : { email: finalEmail, email_confirm: true }),
          ban_duration: 'none',
        })
        const after = await auth.getUser(keptAuthId)
        if (!(after.status === 'found' && sameEmail(after.user.email, finalEmail) && !isBanned(after.user))) {
          return {
            ok: false,
            status: 502,
            error: 'The other login was disabled, but the kept login couldn’t be confirmed with the kept email. Nothing in the database changed — run the merge again.',
          }
        }
      }
    }

    // 3. Database, in the same transaction that holds the locks.
    const moved = await pair.applyDb({ ...choice, keptAuthId, actorId, disabledAuth })
    return { ok: true, moved, keptEmail: finalEmail, disabledAuth }
  })
}
