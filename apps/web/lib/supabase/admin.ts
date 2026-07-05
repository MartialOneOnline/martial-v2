import { createClient } from '@supabase/supabase-js'

// Service-role client for server-only admin operations (creating/deleting
// auth users, bypassing email confirmation). Never import from client
// components — SUPABASE_SECRET_KEY bypasses RLS entirely.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}
