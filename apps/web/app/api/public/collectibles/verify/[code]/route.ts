import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CollectionStatus, CollectibleUnitStatus } from '@/lib/prisma-client/enums'
import { buildPublicVerificationPayload } from '@/lib/services/collectibles/publicPayload'

// GET /api/public/collectibles/verify/[code] — no auth, no private fields ever.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const unit = await prisma.collectibleUnit.findUnique({
    where: { publicVerificationCode: code },
    include: {
      collection: { include: { product: true } },
      tier: true,
      ownerships: { where: { isCurrent: true }, take: 1, select: { ownerDisplayName: true, showOwnerPublicly: true } },
    },
  })

  if (!unit) return NextResponse.json({ state: 'invalid' }, { status: 404 })

  if (unit.collection.status === CollectionStatus.DRAFT) {
    return NextResponse.json({ state: 'unpublished' }, { status: 404 })
  }

  const payload = buildPublicVerificationPayload({
    unit: { editionNumber: unit.editionNumber, status: unit.status, signed: unit.signed, signedAt: unit.signedAt, signedLocation: unit.signedLocation },
    collection: {
      name: unit.collection.name,
      athleteName: unit.collection.athleteName,
      brandName: unit.collection.brandName,
      collectionYear: unit.collection.collectionYear,
      totalUnits: unit.collection.totalUnits,
      heroImageUrl: unit.collection.heroImageUrl,
      authenticationStatement: unit.collection.authenticationStatement,
    },
    tier: { name: unit.tier.name, primaryColor: unit.tier.primaryColor, secondaryColor: unit.tier.secondaryColor },
    product: { name: unit.collection.product.name, imageUrl: unit.collection.product.imageUrl },
    currentOwnership: unit.ownerships[0] ?? null,
  })

  const state = unit.status === CollectibleUnitStatus.ARCHIVED ? 'archived' : 'valid'
  return NextResponse.json({ state, data: payload })
}
