import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { isEmailConfirmOtpType } from '@/lib/auth/emailConfirmLink'

// Target of the email-confirmation link (see lib/auth/emailConfirmLink.ts).
// Redeems the one-time token server-side — which also sets
// email_confirmed_at — and writes the session cookies on this response (no
// Safari ITP 7-day cap, same reasoning as app/auth/callback/route.ts). Then
// hands off to /auth/confirm, whose existing onAuthStateChange logic now
// finds a real cookie session and does the per-role redirect (incl. the
// currentSchoolId cookie for a new school owner).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const redirect = safeConfirmRedirect(searchParams.get('redirect'))

  // An expired or already-used link usually means the account is already
  // confirmed (e.g. the link was opened twice) — /login is the right place
  // either way, and it surfaces the message.
  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)

  if (!tokenHash || !isEmailConfirmOtpType(type)) return fail('Invalid confirmation link.')

  const next = redirect ? `/auth/confirm?redirect=${encodeURIComponent(redirect)}` : '/auth/confirm'
  const response = NextResponse.redirect(`${origin}${next}`)
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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) return fail('This confirmation link has expired or was already used. Please sign in.')

  return response
}
