import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import type { User, ApiResponse } from '@repo/types'
import DashboardClient from './DashboardClient'
import DashboardOnboarding from './DashboardOnboarding'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware should have redirected, but guard here too
  if (!user) {
    redirect('/login?next=/dashboard')
  }

  // Fetch real user data from API
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
      // API not available — continue with Supabase user data only
    }
  }

  const displayName = dbUser?.name ?? user.user_metadata?.name ?? user.email ?? 'Academy Owner'
  const userEmail   = dbUser?.email ?? user.email ?? ''
  const userRole    = dbUser?.role ?? user.user_metadata?.role ?? 'academy'

  // User has no school yet → show onboarding state (not a generic 403)
  // Check if the user has any school membership
  const hasSchool = dbUser != null && (dbUser as any).schoolMembers?.length > 0

  // We pass the data through; DashboardClient will show onboarding if no school data arrives
  return (
    <DashboardClient
      userName={displayName}
      userEmail={userEmail}
      userRole={userRole}
    />
  )
}
