import { createBrowserClient } from '@supabase/ssr'

// autoRefreshToken defaults to true in the browser, which races the
// refresh proxy.ts already does server-side on every /dashboard, /admin,
// /my, /api/admin, /api/dashboard and /api/my request. Refresh tokens are
// single-use, so whichever side loses that race gets an invalid_grant error
// - and the SDK's response to that is to wipe the session client-side,
// which looks like a random forced logout. proxy.ts is the single source
// of truth for refreshing; the browser client should only ever read.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false } }
  )
}
