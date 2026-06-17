import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const response = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'),
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  )

  await supabase.auth.signOut()

  return response
}
