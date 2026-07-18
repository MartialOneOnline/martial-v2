/**
 * Next.js proxy (middleware) — route protection.
 *
 * Rules:
 * - /dashboard/preview → always public (demo mode)
 * - /dashboard/**      → requires session (role check in layout server component)
 * - /admin/**          → requires session (role check in layout server component)
 * - /my/**             → requires session (any role)
 * - /api/admin/**, /api/dashboard/**, /api/my/** → requires session (role check in each route handler)
 * - All other routes   → pass through
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

  // /dashboard/preview is always public
  if (pathname === '/dashboard/preview' || pathname.startsWith('/dashboard/preview/')) {
    return NextResponse.next({ request })
  }

  const isProtected = pathname.startsWith('/dashboard')
    || pathname.startsWith('/admin')
    || pathname.startsWith('/my')
    || pathname.startsWith('/api/admin')
    || pathname.startsWith('/api/dashboard')
    || pathname.startsWith('/api/my')

  if (!isProtected) {
    return NextResponse.next({ request })
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
