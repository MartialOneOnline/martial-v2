import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Runs the actual password sign-in here instead of in the browser Supabase
// client used by login/page.tsx and LoginModal.tsx — that client persists
// the session by writing to document.cookie, and Safari's ITP silently caps
// any cookie written that way to a 7-day lifetime no matter what maxAge the
// SDK requests. A cookie set via a real Set-Cookie response header (what
// this route produces) isn't subject to that cap. See also
// api/auth/google/callback/route.ts (same fix, already shipped for the
// WebView Google fallback) and api/auth/google/idtoken/route.ts and
// auth/callback/route.ts (same fix for the other two sign-in paths).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  let cookiesToApply: { name: string; value: string; options: Record<string, unknown> }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => { cookiesToApply = cs },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  const response = error
    ? NextResponse.json({ error: error.message }, { status: 401 })
    : NextResponse.json({ ok: true, accessToken: data.session?.access_token })

  cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
