/**
 * Next.js proxy (middleware) — route protection.
 *
 * Rules:
 * - /dashboard/preview → always public (demo mode)
 * - /dashboard/**      → requires session (role check in layout server component)
 * - /admin/**          → requires session (role check in layout server component)
 * - /my/**             → requires session (any role)
 * - /api/admin/**, /api/dashboard/**, /api/my/** → requires session (role check in each route handler)
 * - All other routes   → pass through, but if the request carries a Supabase
 *   session cookie, the session is still refreshed here (see below)
 *
 * Middleware checks session cookie + email confirmation. Role/school authorisation
 * is enforced again inside page components and API routes — never rely solely on middleware.
 *
 * Critically, this is also where the Supabase session gets refreshed and the
 * refreshed cookies get persisted back to the browser. API routes run their own
 * getUser()/guardSuperadmin() check too, but they build their own response object
 * and don't carry over any cookies refreshed during that check — so if refresh
 * only ever happened inside an API route, the rotated refresh token would never
 * reach the browser, silently breaking the session. Routing /api/admin, /api/dashboard
 * and /api/my through here first means the token is already fresh by the time
 * those routes run their own check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { authFetchWithTimeout, getUserBounded, isSessionCookieName, shouldRefreshPublic } from '@/lib/auth/proxyRefresh'

function createProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: authFetchWithTimeout },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )
  return { supabase, getResponse: () => response }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /dashboard/preview is always public. dashboard/layout.tsx can't read the
  // pathname itself (Server Components don't get it), so it needs this header
  // to know to skip its own auth redirect for this one route.
  if (pathname === '/dashboard/preview' || pathname.startsWith('/dashboard/preview/')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-dashboard-preview', '1')
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isProtected = pathname.startsWith('/dashboard')
    || pathname.startsWith('/admin')
    || pathname.startsWith('/my')
    || pathname.startsWith('/api/admin')
    || pathname.startsWith('/api/dashboard')
    || pathname.startsWith('/api/my')

  if (!isProtected) {
    // Public pages (/login — the mobile app's entry screen —, /, /explore…)
    // used to skip this entirely, so an expired access token was only ever
    // refreshed by the browser Supabase client (getSession() refreshes an
    // expired token even with autoRefreshToken off). That client persists the
    // rotated tokens via document.cookie, which Safari's ITP caps to 7 days,
    // and it races this proxy for the single-use refresh token — losing that
    // race makes the SDK wipe the session. Refreshing here keeps the cookie a
    // real Set-Cookie header and leaves the browser client nothing to refresh.
    // Anonymous traffic (no session cookie) skips the Auth round trip.
    const hasSession = request.cookies.getAll().some(({ name }) => isSessionCookieName(name))
    if (!hasSession || !shouldRefreshPublic(pathname)) {
      return NextResponse.next({ request })
    }
    // Bounded: if Auth is slow or down, serve the page untouched (cookies
    // as they were) rather than block it or sign the user out.
    const { supabase, getResponse } = createProxyClient(request)
    const auth = await getUserBounded(() => supabase.auth.getUser())
    if (auth.kind === 'unavailable') return NextResponse.next({ request })
    return getResponse()
  }

  const { supabase, getResponse } = createProxyClient(request)
  const auth = await getUserBounded(() => supabase.auth.getUser())

  if (auth.kind === 'unavailable') {
    // Auth is slow/unreachable — not a verdict on the session, so no cookie
    // changes go out. APIs get a retryable 503; pages go to /login, which
    // resumes the session (cookie still there) or shows its network error
    // with Retry, instead of hanging here.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Auth temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '5' } })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  const user = auth.kind === 'user' ? auth.user : null

  if (!user) {
    // API routes expect JSON — redirecting to the login page here would hand
    // the client HTML, which fails res.json() parsing and silently surfaces
    // as empty/blank data instead of a clear auth error.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Keep the query too (e.g. a class link's ?date=&class=&time=), so the
    // user lands back on exactly what they opened after signing in.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Self-serve accounts are created unconfirmed (see app/api/auth/register)
  // and must redeem the emailed confirmation link at /auth/confirm before
  // reaching the app — a valid session alone isn't enough.
  if (!user.email_confirmed_at) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not confirmed' }, { status: 403 })
    }
    const verifyUrl = new URL('/auth/verify-pending', request.url)
    verifyUrl.searchParams.set('email', user.email ?? '')
    verifyUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(verifyUrl)
  }

  return getResponse()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
