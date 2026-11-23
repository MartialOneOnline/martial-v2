import { NextRequest, NextResponse } from 'next/server'
import { acceptInvitation } from '@/lib/claims/accept'
import { getAuthIdentity } from '@/lib/claims/session'

const STATUS: Record<string, number> = {
  NOT_AUTHENTICATED: 401, EMAIL_NOT_CONFIRMED: 403, WRONG_ACCOUNT: 403,
  ACCOUNT_CONFLICT: 409, ACCOUNT_DELETED: 409, OWNER_CONFLICT: 409, ALREADY_USED: 409, INVALID_LINK: 410,
}

// POST /api/claim/[token]/complete — the only route that grants OWNER. Uses
// the caller's own Supabase session; never a client-supplied email, school or
// role. Safe to repeat: a second call by the same person returns success.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const auth = await getAuthIdentity()
  let result
  try {
    result = await acceptInvitation(token, auth)
  } catch (err) {
    console.error('[claim/complete] failed:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.code, ...(result.code === 'INVALID_LINK' ? { reason: result.reason } : {}) }, { status: STATUS[result.code] ?? 400 })
  }
  const res = NextResponse.json({ ok: true, schoolId: result.schoolId, already: result.already })
  // Land in the right school, same cookie /api/auth/context sets.
  res.cookies.set('currentSchoolId', result.schoolId, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
  })
  return res
}
