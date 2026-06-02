import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import type { User, ApiResponse } from '@repo/types'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let dbUser: User | null = null

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
