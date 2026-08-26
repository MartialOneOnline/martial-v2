import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import DashboardShell from '../../components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // /dashboard/preview is public demo mode — proxy.ts flags it since this
  // Server Component has no direct access to the request pathname.
  if ((await headers()).get('x-dashboard-preview') === '1') {
    return <DashboardShell>{children}</DashboardShell>
  }

  const user = await getAuthUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  // SUPERADMIN bypasses the school-membership check; everyone else needs an
  // active, staff-facing SchoolMember somewhere — see hasDashboardAccess().
  if (user.role !== 'SUPERADMIN' && !(await hasDashboardAccess(user.id))) {
    redirect('/my')
  }

  return <DashboardShell>{children}</DashboardShell>
}
