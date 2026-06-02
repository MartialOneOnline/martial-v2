import { createClient } from '../../lib/supabase/server'
import type { User, ApiResponse } from '@repo/types'
import DashboardClient from './DashboardClient'

// Demo data shown to non-authenticated visitors
const DEMO_USER = {
  userName: 'Pablo Cabo',
  userEmail: 'pablo@rogergraciemalaga.com',
  userRole: 'academy',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No session → show public demo dashboard
  if (!user) {
    return <DashboardClient {...DEMO_USER} />
  }

  // Logged in → fetch real user data
  const { data: { session } } = await supabase.auth.getSession()

  let dbUser: User | null = null
  if (session) {
    try {
      const res = await fetch(`${process.env.API_URL}/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })
      const body = (await res.json()) as ApiResponse<User>
      if (body.success) dbUser = body.data
    } catch {
      // API not available — continue with Supabase user data
    }
  }

  const displayName = dbUser?.name ?? user.user_metadata?.name ?? user.email ?? 'Academy Owner'
  const userEmail   = dbUser?.email ?? user.email ?? ''
  const userRole    = dbUser?.role ?? user.user_metadata?.role ?? 'academy'

  return (
    <DashboardClient
      userName={displayName}
      userEmail={userEmail}
      userRole={userRole}
    />
  )
}
