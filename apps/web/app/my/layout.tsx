import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess, hasStudentAccess } from '@/lib/auth/contexts'
import MyShell from '../../components/MyShell'

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login?redirect=/my')
  }

  // Inverse of the /dashboard guard (see dashboard/layout.tsx): a user whose
  // only SchoolMember rows are staff-facing (OWNER, ADMIN, ...) has no real
  // student profile — that row exists purely to grant dashboard permissions.
  // Sending them into /my would render a fake/empty student portal. Only
  // block them if they truly have no STUDENT-role membership anywhere; staff
  // who are *also* enrolled as a student in some school keep access to /my.
  const [staffAccess, studentAccess] = await Promise.all([
    hasDashboardAccess(user.id),
    hasStudentAccess(user.id),
  ])

  if (staffAccess && !studentAccess) {
    redirect('/dashboard')
  }

  return <MyShell>{children}</MyShell>
}
