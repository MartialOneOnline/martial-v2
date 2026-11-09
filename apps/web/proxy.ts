/**
 * Next.js proxy (middleware) — route protection.
 *
 * Rules:
 * - /dashboard/preview → always public (demo mode)
 * - /dashboard/**      → requires session (role check in layout server component)
 * - /admin/**          → requires session (role check in layout server component)
 * - /my/**             → requires session (any role)
 * - /api/admin/**, /api/dashboard/**, /api/my/** → requires session (role check in each route handler)
 * - All other routes   → pass through, but a session cookie is still refreshed
 *                        (see refreshSessionOnly)
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
    if (!shouldRefreshSession(request)) {
      return NextResponse.next({ request })
    }
    return refreshSessionOnly(request)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // API routes expect JSON — redirecting to the login page here would hand
    // the client HTML, which fails res.json() parsing and silently surfaces
    // as empty/blank data instead of a clear auth error.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
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
    verifyUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(verifyUrl)
  }

  return supabaseResponse
}

// Routes that write or clear the session cookies themselves (sign-in,
// sign-out, OAuth/OTP exchange, impersonation). Refreshing an old session
// here as well would put two competing Set-Cookie headers on one response.
const SESSION_WRITING_PREFIXES = [
  '/auth/',
  '/api/auth/login',
  '/api/auth/google/',
  '/api/auth/signout',
  '/api/auth/register',
  // Server-to-server traffic never carries a user session worth refreshing.
  '/api/webhooks/',
  '/api/cron/',
]

// Supabase stores the session as sb-<project>-auth-token, split into
// numbered chunks (.0, .1…) when large. Anything else that shares the prefix,
// such as the PKCE sb-<project>-auth-token-code-verifier, is not a session.
const SESSION_COOKIE_NAME = /^sb-.+-auth-token(?:\.\d+)?$/

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => SESSION_COOKIE_NAME.test(name))
}

export function shouldRefreshSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (SESSION_WRITING_PREFIXES.some(prefix => pathname.startsWith(prefix))) return false
  return hasSupabaseSessionCookie(request)
}

// Longest a public page waits for Supabase Auth before being served anyway.
export const PUBLIC_REFRESH_TIMEOUT_MS = 3000

// Public pages and the API routes outside the protected prefixes
// (/api/bookings, /api/memberships/trial, /api/schools/[slug]/*, /api/auth/me…)
// still read the session through getAuthUser(). If the access token has
// expired (1h), that call refreshes it on the server, which rotates the
// single-use refresh token, but the route can't send the new cookies back, so
// the browser keeps an outdated refresh token. Depending on Supabase's reuse
// rules (reuse interval, parent-token exception) a later request with that
// token may be refused and the session revoked. Refreshing here sends the
// rotated cookies back on every such request.
//
// It never blocks: public routes stay public whatever the outcome, and a slow
// or hung Auth call is cut off after PUBLIC_REFRESH_TIMEOUT_MS. The abort
// makes every pending and retried token request fail as a network error,
// which the SDK treats as transient: it keeps the existing cookies instead of
// clearing them. Writes that arrive after the deadline are ignored.
async function refreshSessionOnly(request: NextRequest) {
  let response = NextResponse.next({ request })
  let settled = false
  const controller = new AbortController()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, {
            ...init,
            signal: init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal,
          }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          if (settled) return
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // getSession() only calls Supabase when the access token is expired or
  // about to expire, so a logged-in visitor browsing public pages pays no
  // extra round trip. This is not used for authorization: route handlers
  // still check getUser().
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<void>(resolve => {
    timer = setTimeout(() => {
      controller.abort()
      resolve()
    }, PUBLIC_REFRESH_TIMEOUT_MS)
  })

  try {
    await Promise.race([supabase.auth.getSession(), deadline])
  } catch {
    // Public route: never fail the request over a refresh problem.
  } finally {
    settled = true
    clearTimeout(timer)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
