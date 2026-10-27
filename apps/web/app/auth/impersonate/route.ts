import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  CURRENT_SCHOOL_ID_COOKIE_NAME,
  CURRENT_SCHOOL_ID_COOKIE_MAX_AGE,
  currentSchoolIdCookieOptions,
} from '@/lib/auth/activeContextCookie'

// Landing for the super admin "Log in as owner" action. The link is built by
// POST /api/admin/schools/[id]/impersonate (superadmin-only, audit-logged)
// from generateLink's hashed_token — a single-use magic-link token, so this
// route needs no auth of its own: holding a valid token *is* the credential,
// exactly like clicking an emailed magic link.
//
// Redeemed server-side (verifyOtp) rather than via the browser client, same
// reasoning as app/auth/callback/route.ts: the session cookies are written
// by the server response (no Safari ITP 7-day cap), and it replaces whatever
// session the browser already had — the superadmin's — instead of the
// implicit-flow #hash that the PKCE browser client refuses to redeem.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const schoolId = searchParams.get('school')

  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)

  if (!tokenHash) return fail('Invalid login link.')

  const response = NextResponse.redirect(`${origin}/dashboard`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  )

  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })
  if (error) return fail('This login link has expired or was already used.')

  // A hint, not authorization: getCurrentSchoolId() re-validates it against
  // the owner's ACTIVE memberships on every dashboard request.
  if (schoolId) {
    response.cookies.set(CURRENT_SCHOOL_ID_COOKIE_NAME, schoolId, {
      ...currentSchoolIdCookieOptions(),
      maxAge: CURRENT_SCHOOL_ID_COOKIE_MAX_AGE,
    })
  }

  return response
}
