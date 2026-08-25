import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { safeRedirect } from '@/lib/safeRedirect'

// Full-page Google OAuth kickoff for the embedded-WebView login fallback.
// GSI's popup-based button can't open inside that WebView (window.open is a
// silent no-op there — see useGoogleSignInButton.ts), and the alternative,
// supabase.auth.signInWithOAuth, sends Google a redirect_uri on Supabase's
// own domain, so Google's consent screen shows "Ir a
// fixipigqxebxferfxlsv.supabase.co" instead of martialapp.com. This route
// uses the same Google client as GSI but with a redirect_uri on our own
// domain (callback/route.ts), so the consent screen matches GSI's branding
// while still working as a plain navigation the WebView can follow.
export async function GET(request: NextRequest) {
  const redirectTo = safeRedirect(request.nextUrl.searchParams.get('redirect'))
  const state = randomBytes(16).toString('hex')

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizeUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!)
  authorizeUrl.searchParams.set('redirect_uri', `${request.nextUrl.origin}/api/auth/google/callback`)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', 'openid email profile')
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('prompt', 'select_account')

  const response = NextResponse.redirect(authorizeUrl)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  }
  response.cookies.set('google_oauth_state', state, cookieOptions)
  if (redirectTo) response.cookies.set('google_oauth_redirect', redirectTo, cookieOptions)
  return response
}
