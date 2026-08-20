import { formatDisplayNumber } from './verification'
import type { CollectibleUnitStatus } from '@/lib/prisma-client/enums'

// Input shape mirrors what the verify API route fetches — kept narrow and
// explicit (rather than accepting the full Prisma row) so it's obvious at a
// glance which fields are even eligible to reach this function, let alone
// the output. videoUrl, certificateUrl, ownerUserId, orderId, email,
// publicVerificationCode's twin "private token" (there isn't one — see the
// CollectibleUnit schema comment) never appear in the parameter type at all.
export interface VerificationSourceData {
  unit: {
    editionNumber: number
    status: CollectibleUnitStatus
    signed: boolean
    signedAt: Date | null
    signedLocation: string | null
  }
  collection: {
    name: string
    athleteName: string | null
    brandName: string | null
    collectionYear: number
    totalUnits: number
    heroImageUrl: string | null
    authenticationStatement: string | null
  }
  tier: {
    name: string
    primaryColor: string
    secondaryColor: string
  }
  product: {
    name: string
    imageUrl: string | null
  }
  currentOwnership: { ownerDisplayName: string | null; showOwnerPublicly: boolean } | null
}

export interface PublicVerificationPayload {
  displayNumber: string
  editionNumber: number
  totalUnits: number
  status: CollectibleUnitStatus
  signed: boolean
  signedAt: string | null
  signedLocation: string | null
  collectionName: string
  athleteName: string | null
  brandName: string | null
  collectionYear: number
  productName: string
  imageUrl: string | null
  authenticationStatement: string | null
  tierName: string
  primaryColor: string
  secondaryColor: string
  ownerDisplayName: string | null
}

// The only function allowed to shape a response for
// /api/public/collectibles/verify/[code] — every field returned here is
// deliberately safe to show to anyone with the link, no authentication.
export function buildPublicVerificationPayload(data: VerificationSourceData): PublicVerificationPayload {
  const { unit, collection, tier, product, currentOwnership } = data
  return {
    displayNumber: formatDisplayNumber(unit.editionNumber, collection.totalUnits),
    editionNumber: unit.editionNumber,
    totalUnits: collection.totalUnits,
    status: unit.status,
    signed: unit.signed,
    signedAt: unit.signedAt ? unit.signedAt.toISOString() : null,
    signedLocation: unit.signedLocation,
    collectionName: collection.name,
    athleteName: collection.athleteName,
    brandName: collection.brandName,
    collectionYear: collection.collectionYear,
    productName: product.name,
    imageUrl: product.imageUrl,
    authenticationStatement: collection.authenticationStatement,
    tierName: tier.name,
    primaryColor: tier.primaryColor,
    secondaryColor: tier.secondaryColor,
    ownerDisplayName: currentOwnership?.showOwnerPublicly ? currentOwnership.ownerDisplayName : null,
  }
}
