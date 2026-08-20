import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CollectionStatus, CollectibleUnitStatus } from '@/lib/prisma-client/enums'
import { resolveUnitPrice } from '@/lib/services/collectibles/pricing'

// GET /api/public/marketplace/collections/[slug]
// Published-only, no private fields (no ownerUserId, video/certificate URLs,
// verification codes, order info) — real availability, not a display trick.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const collection = await prisma.limitedCollection.findUnique({
    where: { slug },
    include: {
      product: { select: { name: true, description: true, price: true, currency: true, imageUrl: true } },
      school: { select: { name: true, slug: true, city: true, country: true } },
      tiers: { orderBy: { displayOrder: 'asc' } },
    },
  })

  if (!collection || collection.status === CollectionStatus.DRAFT || collection.status === CollectionStatus.ARCHIVED) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const units = await prisma.collectibleUnit.findMany({
    where: { collectionId: collection.id },
    select: { tierId: true, size: true, status: true, specificPrice: true, currency: true, editionNumber: true },
  })

  const availableUnits = units.filter(u => u.status === CollectibleUnitStatus.AVAILABLE)
  const sizesAvailable = Array.from(new Set(availableUnits.map(u => u.size).filter((s): s is string => !!s)))
  const availableNumbers = collection.numberSelectionEnabled
    ? availableUnits.map(u => u.editionNumber).sort((a, b) => a - b)
    : []

  const tiers = collection.tiers.map(tier => {
    const tierUnits = units.filter(u => u.tierId === tier.id)
    const tierAvailable = tierUnits.filter(u => u.status === CollectibleUnitStatus.AVAILABLE)
    const priceSample = tierAvailable[0]
    const resolved = resolveUnitPrice({
      unit: { specificPrice: priceSample?.specificPrice ?? null, currency: priceSample?.currency ?? null },
      tier: { price: tier.price, currency: tier.currency },
      product: { price: collection.product.price, currency: collection.product.currency },
    })
    return {
      id: tier.id,
      name: tier.name,
      code: tier.code,
      description: tier.description,
      startNumber: tier.startNumber,
      endNumber: tier.endNumber,
      primaryColor: tier.primaryColor,
      secondaryColor: tier.secondaryColor,
      visualStyle: tier.visualStyle,
      benefits: tier.benefits,
      packagingDescription: tier.packagingDescription,
      totalUnits: tierUnits.length,
      availableUnits: tierAvailable.length,
      soldOut: tierUnits.length > 0 && tierAvailable.length === 0,
      price: resolved.price,
      currency: resolved.currency,
    }
  })

  const totalAvailable = availableUnits.length
  const totalGenerated = units.length

  return NextResponse.json({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    status: collection.status,
    sellerType: collection.sellerType,
    sellerName: collection.sellerType === 'MARTIAL' ? 'Martial' : collection.school?.name ?? null,
    schoolSlug: collection.school?.slug ?? null,
    athleteName: collection.athleteName,
    brandName: collection.brandName,
    collectionYear: collection.collectionYear,
    totalUnits: collection.totalUnits,
    totalGenerated,
    totalAvailable,
    soldOut: totalGenerated > 0 && totalAvailable === 0,
    launchDate: collection.launchDate,
    endDate: collection.endDate,
    numberSelectionEnabled: collection.numberSelectionEnabled,
    sizeSelectionEnabled: collection.sizeSelectionEnabled,
    automaticAssignmentEnabled: collection.automaticAssignmentEnabled,
    authenticityEnabled: collection.authenticityEnabled,
    heroImageUrl: collection.heroImageUrl,
    story: collection.story,
    product: collection.product,
    tiers,
    sizesAvailable,
    availableNumbers,
  })
}
