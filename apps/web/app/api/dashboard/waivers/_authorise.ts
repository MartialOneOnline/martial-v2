import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

// Shared by every /api/dashboard/waivers/** route (send/list, templates,
// resend, pdf, mark-signed) — not a route file itself, so the App Router
// ignores it for routing purposes.
export async function authoriseWaivers() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 } as const
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.waivers.manage')) return { error: 'Forbidden', status: 403 } as const
    } catch {
      return { error: 'Forbidden', status: 403 } as const
    }
  }
  return { user, schoolId }
}
