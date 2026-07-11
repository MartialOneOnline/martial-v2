import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { ACTIVE_CONTEXT_MODES, isValidContext, type ActiveContext, type ActiveContextMode } from '@/lib/auth/activeContext'
import {
  ACTIVE_CONTEXT_COOKIE_NAME,
  ACTIVE_CONTEXT_COOKIE_MAX_AGE,
  activeContextCookieOptions,
  serializeActiveContextCookie,
} from '@/lib/auth/activeContextCookie'

// POST/DELETE /api/auth/context/select — set/clear the
// martial_active_context cookie for the Facebook-style context switcher.
//
// Deliberately a NEW path, not a new method added to the existing
// api/auth/context/route.ts: that route already owns POST/DELETE for the
// unrelated, pre-existing `currentSchoolId` cookie (a single schoolId, no
// mode). Reusing the same path for a different cookie/shape would make one
// route juggle two independent cookies behind one URL, and would force every
// future caller of the old endpoint to reason about whether their request
// also touches this new mechanism. A sibling path under the same
// `/api/auth/context` prefix (this file lives at .../context/select) keeps
// both discoverable without either one's tests/callers needing to change.
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Destructure only the two fields we understand — anything else on the
  // body is silently dropped here and never forwarded, spread, or reflected
  // back in the response or the cookie.
  const { mode, schoolId } = body as Record<string, unknown>

  if (typeof mode !== 'string' || !(ACTIVE_CONTEXT_MODES as readonly string[]).includes(mode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${ACTIVE_CONTEXT_MODES.join(', ')}` },
      { status: 400 },
    )
  }
  if (typeof schoolId !== 'string' || schoolId.length === 0) {
    return NextResponse.json({ error: 'schoolId is required' }, { status: 400 })
  }

  const context: ActiveContext = { mode: mode as ActiveContextMode, schoolId }

  // Shape is valid at this point — whether *this* user actually has that
  // context is a separate question, and getting it wrong is an authorization
  // failure (403), not a malformed request (400). Covers: schoolId belongs to
  // another user, schoolId doesn't exist, or mode doesn't match this user's
  // real role for that school (e.g. claiming 'dashboard' while only a
  // STUDENT there).
  const valid = await isValidContext(user.id, context)
  if (!valid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const res = NextResponse.json({ activeContext: context })
  res.cookies.set(ACTIVE_CONTEXT_COOKIE_NAME, serializeActiveContextCookie(context), {
    ...activeContextCookieOptions(),
    maxAge: ACTIVE_CONTEXT_COOKIE_MAX_AGE,
  })
  return res
}

// No session check here, matching the existing DELETE /api/auth/context
// (currentSchoolId) for the same reason: clearing a context hint has no
// confidentiality implications either way — an unauthenticated caller
// clearing a cookie that (for them) likely doesn't exist, or isn't trusted
// without revalidation anyway, is harmless. Kept consistent with the sibling
// endpoint rather than introducing a new auth rule for just this one clear.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACTIVE_CONTEXT_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
