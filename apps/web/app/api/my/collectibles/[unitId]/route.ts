import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { formatDisplayNumber } from '@/lib/services/collectibles/verification'

async function canAccessUnit(userId: string, userRole: string, unit: { ownerUserId: string | null; collection: { sellerType: string; schoolId: string | null } }) {
  if (unit.ownerUserId === userId) return true
  if (userRole === 'SUPERADMIN') return true
  if (unit.collection.sellerType === 'SCHOOL' && unit.collection.schoolId) {
    try {
      const member = await requireSchoolAccess(userId, unit.collection.schoolId)
      return hasPermission(member.role, 'school.marketplace.view')
    } catch {
      return false
    }
  }
  return false
}

// GET /api/my/collectibles/[unitId] — full detail (video/certificate URLs
// included) for the owner, or staff/admin with marketplace access. Never
// exposed unauthenticated — that's what /api/public/collectibles/verify is for.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { unitId } = await params
  const unit = await prisma.collectibleUnit.findUnique({
    where: { id: unitId },
    include: {
      collection: { include: { product: true } },
      tier: true,
      ownerships: { where: { isCurrent: true }, take: 1 },
      order: { select: { id: true, status: true, total: true, currency: true, createdAt: true } },
    },
  })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const authorized = await canAccessUnit(user.id, user.role, unit)
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ownership = unit.ownerships[0] ?? null

  return NextResponse.json({
    id: unit.id,
    editionNumber: unit.editionNumber,
    displayNumber: formatDisplayNumber(unit.editionNumber, unit.collection.totalUnits),
    totalUnits: unit.collection.totalUnits,
    size: unit.size,
    status: unit.status,
    signed: unit.signed,
    signedAt: unit.signedAt,
    signedLocation: unit.signedLocation,
    videoUrl: unit.videoUrl,
    certificateUrl: unit.certificateUrl,
    publicVerificationCode: unit.publicVerificationCode,
    tier: unit.tier,
    collection: {
      id: unit.collection.id,
      name: unit.collection.name,
      slug: unit.collection.slug,
      athleteName: unit.collection.athleteName,
      brandName: unit.collection.brandName,
      collectionYear: unit.collection.collectionYear,
      story: unit.collection.story,
      authenticationStatement: unit.collection.authenticationStatement,
    },
    product: { name: unit.collection.product.name, imageUrl: unit.collection.product.imageUrl },
    order: unit.order,
    ownership: ownership ? { ownerDisplayName: ownership.ownerDisplayName, showOwnerPublicly: ownership.showOwnerPublicly, acquiredAt: ownership.acquiredAt } : null,
    isOwner: unit.ownerUserId === user.id,
  })
}
