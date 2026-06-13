/**
 * Next.js proxy (middleware) — route protection.
 *
 * Rules:
 * - /dashboard/preview → always public (demo mode)
 * - /dashboard/**      → requires Supabase session; no session → /login?next=<url>
 * - /admin/**          → requires Supabase session; no session → /login?next=<url>
 * - All other routes   → pass through
 *
 * NOTE: Middleware only checks the session cookie. Authorisation (school access,
 * SUPERADMIN role) is enforced again inside page components and API routes.
 * Do NOT rely solely on middleware for data authorisation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /dashboard/preview is always public — skip all checks
  if (pathname === '/dashboard/preview' || pathname.startsWith('/dashboard/preview/')) {
    return NextResponse.next({ request })
  }

  // Protect /dashboard/** and /admin/**
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin     = pathname.startsWith('/admin')

  if (!isDashboard && !isAdmin) {
    return NextResponse.next({ request })
  }

  // Build a response to forward cookies (required by Supabase SSR)
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

  // No session → redirect to login with return URL
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
