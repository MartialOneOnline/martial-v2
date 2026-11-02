// Who can read the Balance (same permission as its menu entry) and who can
// add expenses from it (same as creating a transaction).
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import type { Permission } from '@/lib/auth/permissions'

export async function balanceAccess(need: Permission): Promise<
  { error: string; status: number } | { schoolId: string; canManage: boolean }
> {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role === 'SUPERADMIN') return { schoolId, canManage: true }
  try {
    // requireSchoolAccess: an ACTIVE member of THIS school (any role, CUSTOM included);
    // a STUDENT has none of these permissions, so it ends in 403 below
    const member = await requireSchoolAccess(user.id, schoolId)
    if (!await memberHasPermission(member, need)) return { error: 'Forbidden', status: 403 }
    return { schoolId, canManage: await memberHasPermission(member, 'school.payments.manage') }
  } catch {
    return { error: 'Forbidden', status: 403 }
  }
}
