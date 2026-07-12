import { cookies } from 'next/headers'
import { ACTIVE_CONTEXT_MODES, isValidContext, listAvailableContexts, type ActiveContext } from './activeContext'

// Split out from activeContext.ts on purpose, mirroring why activeContext.ts
// itself was split from contexts.ts: activeContext.ts is pure DB logic (no
// framework coupling), which is what let its existing test file mock only
// `@/lib/db` and nothing else. This file is the next/headers-coupled layer —
// reading/parsing/serializing the cookie and revalidating it — kept separate
// so activeContext.ts's tests never need to mock next/headers, and so this
// file's own tests can mock next/headers + isValidContext without dragging
// Prisma into it.
//
// IMPORTANT — this is a DIFFERENT, PARALLEL cookie from `currentSchoolId`
// (see app/api/auth/context/route.ts). That one is the pre-existing
// dashboard-only "which school am I currently viewing" hint, read by
// getCurrentSchoolId()/requireDashboardAccess() in lib/auth/server.ts and
// scoped to a single schoolId. This one is the full {mode, schoolId} pair
// the Facebook-style context switcher needs — it also captures *which portal*
// (dashboard vs student) the user is in, which currentSchoolId has no concept
// of. The two cookies are NOT unified here: whether/how a future PR merges
// them (e.g. deriving currentSchoolId from this cookie when mode==='dashboard')
// is an open decision left to that PR, documented in CONTEXT.md. Until then,
// nothing in this file touches `currentSchoolId`, and nothing in
// app/api/auth/context/route.ts touches this cookie.

export const ACTIVE_CONTEXT_COOKIE_NAME = 'martial_active_context'

// 60 days, vs. currentSchoolId's 7: currentSchoolId is picked implicitly and
// silently re-derived on almost every dashboard action (switching between
// schools you manage happens *within* a session), so a short TTL isn't
// costly — it's re-set constantly anyway. The {mode, schoolId} pair here is
// a deliberate, explicit choice from a picker UI ("which hat am I wearing"),
// expected to be made once per device and left alone for a long time. A
// longer TTL doesn't weaken security: every read revalidates against the DB
// via isValidContext() (see getActiveContext() below), so an expired-in-
// spirit-but-not-in-TTL cookie for a membership that got archived/removed
// simply stops working the moment it's checked, regardless of maxAge.
export const ACTIVE_CONTEXT_COOKIE_MAX_AGE = 60 * 60 * 24 * 60 // 60 days

// Cookie options shared by every route that sets this cookie — kept here
// (not duplicated per-route) so a future change to e.g. sameSite only has to
// happen once. maxAge is intentionally omitted: callers pass it explicitly
// (ACTIVE_CONTEXT_COOKIE_MAX_AGE to set, 0 to clear) since Next's cookie API
// takes maxAge as a sibling option, not something this object can default
// away from a clear operation.
export function activeContextCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

// currentSchoolId — the pre-existing, dashboard-only cookie from
// api/auth/context/route.ts (see the big comment above). That file is
// intentionally left untouched by this ticket (it's the old endpoint being
// mirrored, not replaced), so its cookie name/options aren't defined there as
// exports — they're just inline literals in that route. This trio mirrors
// those exact literals so POST /api/auth/context/select can sync
// currentSchoolId (mode==='dashboard' only — see route.ts for the branch)
// without hand-copying the same 5-field options object a second time in a
// second file. If api/auth/context/route.ts's literals ever change, keep
// these in sync by hand — there is no single shared source for both files.
export const CURRENT_SCHOOL_ID_COOKIE_NAME = 'currentSchoolId'
export const CURRENT_SCHOOL_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days — matches api/auth/context/route.ts, NOT the 60-day martial_active_context TTL above (different cookies, deliberately different lifetimes)
export function currentSchoolIdCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

// Parses the raw cookie value into an ActiveContext shape, or null if it's
// missing, not valid JSON, or doesn't match the shape exactly (mode must be
// one of ACTIVE_CONTEXT_MODES, schoolId a non-empty string). Never throws —
// a hand-edited or stale cookie is just treated as "no context", not an
// error. Callers MUST still call isValidContext() on the result before
// trusting it for anything: this function only checks *shape*, not whether
// the user actually has that context.
export function parseActiveContextCookie(raw: string | undefined): ActiveContext | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const { mode, schoolId } = parsed as Record<string, unknown>

  if (
    typeof mode === 'string' &&
    (ACTIVE_CONTEXT_MODES as readonly string[]).includes(mode) &&
    typeof schoolId === 'string' &&
    schoolId.length > 0
  ) {
    return { mode: mode as ActiveContext['mode'], schoolId }
  }

  return null
}

// Minimal, stable serialization — just the two fields ActiveContext defines,
// never whatever extra properties happen to be on the object passed in.
export function serializeActiveContextCookie(context: ActiveContext): string {
  return JSON.stringify({ mode: context.mode, schoolId: context.schoolId })
}

// Reads the cookie for the current request, parses it, and revalidates it
// against the DB for this specific user. Returns null whenever the cookie is
// absent, malformed, or no longer backed by a real membership (e.g. it was
// set while the user was ACTIVE in a school and that membership has since
// been archived/removed, or the cookie was hand-edited to reference a school
// the user was never a member of). This is the ONLY sanctioned way to read
// the active context — nothing should read the raw cookie value and use it
// directly.
export async function getActiveContext(userId: string): Promise<ActiveContext | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(ACTIVE_CONTEXT_COOKIE_NAME)?.value
  const parsed = parseActiveContextCookie(raw)
  if (!parsed) return null

  const valid = await isValidContext(userId, parsed)
  return valid ? parsed : null
}

// The single school id GET/PATCH /api/my/** should use when a real STUDENT
// SchoolMember row exists at more than one school for this user. A 'dashboard'
// cookie doesn't count as "no student context" being an error — it's just not
// a student selection, so it falls through to the same resolution as no
// cookie at all (see the mode check below).
export type ActiveStudentContext =
  | { kind: 'ok'; schoolId: string }
  // The user has a real STUDENT SchoolMember at 2+ schools and neither a
  // valid 'student' cookie nor an unambiguous single school to fall back to.
  // Callers must respond 409 student_context_required — never guess by
  // picking "the first one found".
  | { kind: 'ambiguous' }
  // No real STUDENT SchoolMember anywhere for this user. Callers decide what
  // this means for them (e.g. /api/my still 200s a brand-new user with no
  // school yet, but 403s a staff-only account — see hasDashboardAccess()).
  | { kind: 'none' }

// Resolves which single school's data a /api/my/** endpoint should serve for
// this user, in priority order:
//   1. A valid 'student'-mode martial_active_context cookie — the user's
//      explicit choice from /choose-profile.
//   2. Exactly one real STUDENT context (via listAvailableContexts) — a safe
//      fallback for the common case (single-school student, or a fresh
//      picker cookie that hasn't been set yet), no cookie required.
//   3. Two or more STUDENT contexts with no (or no matching) cookie — this is
//      the only case that can't be resolved safely, hence 'ambiguous'.
//   4. Zero STUDENT contexts — 'none'.
//
// Never mixes schools: every branch above resolves to at most one schoolId,
// or an explicit signal that none could be determined.
export async function getActiveStudentContext(userId: string): Promise<ActiveStudentContext> {
  const cookieContext = await getActiveContext(userId)
  if (cookieContext && cookieContext.mode === 'student') {
    return { kind: 'ok', schoolId: cookieContext.schoolId }
  }

  const studentContexts = (await listAvailableContexts(userId)).filter(c => c.mode === 'student')

  if (studentContexts.length === 0) return { kind: 'none' }
  const [only] = studentContexts
  if (studentContexts.length === 1 && only) return { kind: 'ok', schoolId: only.schoolId }
  return { kind: 'ambiguous' }
}
