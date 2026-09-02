import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { getSchoolMembership } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { getStudentsForSchool } from './data'
import UsersSplitShell from './UsersSplitShell'

// Wraps both the list route (page.tsx) and every profile route
// ([id]/page.tsx). Next.js keeps this layout mounted across client-side
// navigation between those two, so UsersSplitShell's (and StudentListPanel's)
// React state survives switching students — that's the whole point of this
// file. It only ever gates the compact desktop list panel below; it must
// never gate {children} — page.tsx and [id]/page.tsx keep their own
// (intentionally different) permission checks untouched.
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getAuthUser()
  const schoolId = viewer ? await getCurrentSchoolId() : null

  if (!viewer || !schoolId) {
    return <UsersSplitShell listStudents={null}>{children}</UsersSplitShell>
  }

  let canViewList = viewer.role === 'SUPERADMIN'
  if (!canViewList) {
    const membership = await getSchoolMembership(viewer.id, schoolId)
    canViewList = !!membership && hasPermission(membership.role, 'school.members.view')
  }

  const listStudents = canViewList ? await getStudentsForSchool(schoolId) : null

  return <UsersSplitShell listStudents={listStudents}>{children}</UsersSplitShell>
}
