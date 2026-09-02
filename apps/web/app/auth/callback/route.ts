import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeRedirect } from '@/lib/safeRedirect'

// Apple/Microsoft's `signInWithOAuth` redirectTo points here instead of
// straight to /login, so the PKCE `code` Supabase hands back gets exchanged
// server-side. The browser Supabase client's own detectSessionInUrl would do
// that same exchange client-side (writing the session via document.cookie),
// and Safari's ITP silently caps any cookie written that way to 7 days no
// matter what maxAge is requested — see api/auth/login/route.ts for the
// full explanation. This mirrors api/auth/google/callback/route.ts, which
// already does the equivalent for the WebView Google fallback; landing on
// /login?oauth=1 afterward reuses that same page's existing
// onAuthStateChange handling (INITIAL_SESSION) for the login-event ping and
// post-login redirect, so no new client-side handling is needed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const redirectTarget = safeRedirect(searchParams.get('redirect'))
  const redirectQuery = redirectTarget ? `&redirect=${encodeURIComponent(redirectTarget)}` : ''

  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)

  if (oauthError) return fail(searchParams.get('error_description') || oauthError)
  if (!code) return fail('Sign-in failed. Please try again.')

  const response = NextResponse.redirect(`${origin}/login?oauth=1${redirectQuery}`)
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return fail('Sign-in failed. Please try again.')

  return response
}
