import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { formatDisplayNumber } from '@/lib/services/collectibles/verification'

// GET /api/my/collectibles — "My Collection"
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerships = await prisma.collectibleOwnership.findMany({
    where: { ownerUserId: user.id, isCurrent: true },
    include: {
      collectibleUnit: {
        include: {
          collection: { include: { product: true } },
          tier: true,
        },
      },
    },
    orderBy: { acquiredAt: 'desc' },
  })

  const items = ownerships.map(o => ({
    ownershipId: o.id,
    acquiredAt: o.acquiredAt,
    unitId: o.collectibleUnit.id,
    editionNumber: o.collectibleUnit.editionNumber,
    displayNumber: formatDisplayNumber(o.collectibleUnit.editionNumber, o.collectibleUnit.collection.totalUnits),
    status: o.collectibleUnit.status,
    signed: o.collectibleUnit.signed,
    tierName: o.collectibleUnit.tier.name,
    primaryColor: o.collectibleUnit.tier.primaryColor,
    collectionName: o.collectibleUnit.collection.name,
    athleteName: o.collectibleUnit.collection.athleteName,
    productName: o.collectibleUnit.collection.product.name,
    imageUrl: o.collectibleUnit.collection.product.imageUrl,
  }))

  return NextResponse.json({ items })
}
