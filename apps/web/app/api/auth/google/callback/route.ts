import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Exchanges Google's code ourselves (server-side, via GOOGLE_CLIENT_SECRET)
// instead of letting supabase.auth.signInWithOAuth do it — see
// start/route.ts for why this exists. "Skip nonce checks" is already
// enabled on the Google provider (required for the GSI flow this mirrors),
// so signInWithIdToken here doesn't need a nonce either.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')
  const expectedState = request.cookies.get('google_oauth_state')?.value
  const redirectTarget = request.cookies.get('google_oauth_redirect')?.value

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)
    res.cookies.delete('google_oauth_state')
    res.cookies.delete('google_oauth_redirect')
    return res
  }

  if (oauthError) return fail(oauthError)
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail('Google sign-in failed. Please try again.')
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/api/auth/google/callback`,
    }),
  })
  const idToken = tokenRes.ok ? (await tokenRes.json()).id_token : null
  if (!idToken) return fail('Google sign-in failed. Please try again.')

  const redirectQuery = redirectTarget ? `&redirect=${encodeURIComponent(redirectTarget)}` : ''
  const response = NextResponse.redirect(`${origin}/login?oauth=1${redirectQuery}`)
  response.cookies.delete('google_oauth_state')
  response.cookies.delete('google_oauth_redirect')

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

  const { error: signInErr } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
  if (signInErr) return fail('Google sign-in failed. Please try again.')

  return response
}
