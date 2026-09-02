import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Server-side counterpart to useGoogleSignInButton's GSI credential callback
// — see api/auth/login/route.ts for why this can't just call
// supabase.auth.signInWithIdToken() from the browser client (Safari's ITP
// 7-day cap on JS-written cookies).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const idToken = typeof body?.idToken === 'string' ? body.idToken : ''
  if (!idToken) {
    return NextResponse.json({ error: 'Missing Google credential.' }, { status: 400 })
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

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })

  const response = error
    ? NextResponse.json({ error: error.message }, { status: 401 })
    : NextResponse.json({ ok: true, accessToken: data.session?.access_token })

  cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
