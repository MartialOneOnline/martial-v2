import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import UsersClient from './UsersClient'
import { getStudentsForSchool } from './data'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { getSchoolMembership } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { ForbiddenView } from '../../../components/RequirePermission'

export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageContent />
    </Suspense>
  )
}

async function UsersPageContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <UsersClient students={[]} />

  // getCurrentSchoolId() validates the cookie against an ACTUAL active
  // membership and falls back to a real one if it's stale — critical for
  // anyone who belongs to more than one school (e.g. an owner who is also a
  // student elsewhere), same as the client sidebar already does.
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return <UsersClient students={[]} />

  return <UsersPageWithSchool schoolId={schoolId} />
}

async function UsersPageWithSchool({ schoolId }: { schoolId: string }) {
  const viewer = await getAuthUser()
  if (viewer && viewer.role !== 'SUPERADMIN') {
    const viewerMembership = await getSchoolMembership(viewer.id, schoolId)
    if (!viewerMembership || !hasPermission(viewerMembership.role, 'school.members.view')) {
      return <ForbiddenView />
    }
  }

  const students = await getStudentsForSchool(schoolId)

  // Members with an ACTIVE membership whose access status disagrees (e.g.
  // stuck INACTIVE) — surfaced as an OWNER/ADMIN-only banner below. Computed
  // from data already fetched above, no extra query needed.
  //
  // PENDING/LEAD are deliberately excluded: Invite User can assign a trial
  // plan before the invite is accepted (assignPlan called with
  // activateMember: false — see members/invite/route.ts), so a not-yet-
  // accepted invite legitimately sits at PENDING/LEAD with an ACTIVE trial
  // Membership. That's the intended steady state, not drift. Mirrors the
  // same candidate set as findMembershipStatusDrift() in
  // lib/services/membership.ts (used by the superadmin panel) — this page
  // computes it locally instead of calling that function only because the
  // membership data is already fetched above.
  const driftedMembers = students
    .filter(s => s.activeMembership && ['INACTIVE', 'FROZEN', 'ARCHIVED'].includes(s.status))
    .map(s => ({ id: s.id, name: s.name, status: s.status }))

  let canViewDrift = false
  if (driftedMembers.length > 0 && viewer) {
    canViewDrift = viewer.role === 'SUPERADMIN'
      || ['OWNER', 'ADMIN'].includes((await getSchoolMembership(viewer.id, schoolId))?.role ?? '')
  }

  return <UsersClient students={students} driftedMembers={canViewDrift ? driftedMembers : []} />
}
