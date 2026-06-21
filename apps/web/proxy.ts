/**
 * Next.js proxy (middleware) — route protection.
 *
 * Rules:
 * - /dashboard/preview → always public (demo mode)
 * - /dashboard/**      → requires session (role check in layout server component)
 * - /admin/**          → requires session (role check in layout server component)
 * - /my/**             → requires session (any role)
 * - All other routes   → pass through
 *
 * Middleware only checks session cookie. Role/school authorisation is enforced
 * again inside page components and API routes — never rely solely on middleware.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /dashboard/preview is always public
  if (pathname === '/dashboard/preview' || pathname.startsWith('/dashboard/preview/')) {
    return NextResponse.next({ request })
  }

  const isProtected = pathname.startsWith('/dashboard')
    || pathname.startsWith('/admin')
    || pathname.startsWith('/my')

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
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
