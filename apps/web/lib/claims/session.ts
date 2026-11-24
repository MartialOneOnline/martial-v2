import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AuthIdentity } from './accept'

// The caller's own Supabase session (cookie), verified with Supabase Auth.
export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email, emailConfirmedAt: user.email_confirmed_at ?? null }
}
