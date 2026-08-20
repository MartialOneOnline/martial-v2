import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { MarketplaceSellerType } from '@/lib/prisma-client/enums'
import type { SellerContext } from '@/lib/services/collectibles/collectionService'

type AuthResult<T> = T | { error: string; status: number }

// Same authorise(permission) shape used by every other /api/dashboard/* route
// (see apps/web/app/api/dashboard/events/route.ts) — resolves the current
// school-scoped SellerContext so marketplace route handlers stay one-liners.
export async function authoriseSchoolMarketplace(
  permission: Permission,
): Promise<AuthResult<{ userId: string; schoolId: string; seller: SellerContext }>> {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, permission)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { userId: user.id, schoolId, seller: { sellerType: MarketplaceSellerType.SCHOOL, schoolId } }
}

// Martial-owned marketplace (Buchecha and future direct-from-Martial drops) —
// same plain SUPERADMIN gate as every other /api/admin/* route, no school
// context involved at all.
export async function authoriseAdminMarketplace(): Promise<AuthResult<{ userId: string; seller: SellerContext }>> {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  if (user.role !== 'SUPERADMIN') return { error: 'Forbidden', status: 403 }
  return { userId: user.id, seller: { sellerType: MarketplaceSellerType.MARTIAL, schoolId: null } }
}
