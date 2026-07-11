import { cookies } from 'next/headers'
import { ACTIVE_CONTEXT_MODES, isValidContext, type ActiveContext } from './activeContext'

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
