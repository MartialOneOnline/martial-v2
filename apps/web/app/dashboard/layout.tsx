import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import DashboardShell from '../../components/DashboardShell'

const STAFF_ROLES = new Set(['SUPERADMIN', 'SCHOOL_OWNER', 'ADMIN', 'INSTRUCTOR'])

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  if (!STAFF_ROLES.has(user.role)) {
    redirect('/my')
  }

  return <DashboardShell>{children}</DashboardShell>
}
