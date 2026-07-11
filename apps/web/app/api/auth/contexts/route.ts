import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/server'
import { listAvailableContexts } from '@/lib/auth/activeContext'
import { getActiveContext } from '@/lib/auth/activeContextCookie'

// GET /api/auth/contexts — read-only: lists every {mode, school} pair this
// user can switch into (for the Facebook-style context switcher) plus
// whichever one, if any, is currently persisted in the
// martial_active_context cookie. This route never sets/clears that cookie —
// see POST/DELETE /api/auth/context/select for that. Note the plural path:
// this is intentionally a different, new endpoint from the pre-existing
// GET /api/auth/me (which returns the currentSchoolId-based dashboard
// contexts) and from POST/DELETE /api/auth/context (currentSchoolId) — see
// activeContextCookie.ts for why the two cookies/endpoint families are kept
// separate for now.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // activeContext comes from getActiveContext(), which parses the cookie
  // AND revalidates it against the DB (isValidContext) — a hand-edited or
  // stale cookie (e.g. referencing a since-archived membership) comes back
  // as null here, never as a trusted value read straight off the cookie.
  const [contexts, activeContext] = await Promise.all([
    listAvailableContexts(user.id),
    getActiveContext(user.id),
  ])

  return NextResponse.json({ contexts, activeContext })
}
