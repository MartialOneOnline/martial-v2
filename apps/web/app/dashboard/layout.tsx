import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import DashboardShell from '../../components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
