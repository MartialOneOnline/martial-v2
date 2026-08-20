import { prisma } from '@/lib/db'
import type { Prisma } from '@/lib/prisma-client/client'
import { CollectionStatus, MarketplaceSellerType, CollectibleUnitStatus } from '@/lib/prisma-client/enums'
import { slugify, uniqueSlug } from '@/lib/slug'
import { validateTiers, type TierRange } from './tiers'
import { generateUnits as generateUnitsDb } from './unitGenerator'

// Every route (dashboard/school and admin/Martial) constructs one of these
// from its own auth resolution and passes it in — the service layer itself
// never re-derives "who is the seller" from a request.
export interface SellerContext {
  sellerType: MarketplaceSellerType
  schoolId: string | null
}

const COLLECTION_INCLUDE = {
  product: true,
  tiers: { orderBy: { displayOrder: 'asc' as const } },
  _count: { select: { units: true } },
}

export class CollectionValidationError extends Error {
  errors: string[]
  constructor(errors: string[]) {
    super(errors.join('; '))
    this.errors = errors
  }
}

// Scopes every collection query to the caller's seller context — a school
// can never see/touch another school's or Martial's collections, and vice
// versa. Centralized here so every route below stays a one-liner for auth
// scoping instead of repeating the schoolId/sellerType condition.
function sellerWhere(seller: SellerContext): Prisma.LimitedCollectionWhereInput {
  return seller.sellerType === MarketplaceSellerType.MARTIAL
    ? { sellerType: MarketplaceSellerType.MARTIAL }
    : { sellerType: MarketplaceSellerType.SCHOOL, schoolId: seller.schoolId! }
}

export async function listCollections(seller: SellerContext) {
  return prisma.limitedCollection.findMany({
    where: sellerWhere(seller),
    include: COLLECTION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCollection(seller: SellerContext, id: string) {
  return prisma.limitedCollection.findFirst({
    where: { id, ...sellerWhere(seller) },
    include: COLLECTION_INCLUDE,
  })
}

interface TierInput {
  name: string
  code: string
  description?: string
  startNumber: number
  endNumber: number
  price?: number | null
  currency?: string | null
  primaryColor: string
  secondaryColor: string
  visualStyle?: string
  benefits?: string[]
  packagingDescription?: string
  displayOrder?: number
}

interface CreateCollectionInput {
  seller: SellerContext
  product: { name: string; description?: string; price: number; currency?: string; imageUrl?: string; categoryId?: string }
  collection: {
    name: string
    slug?: string
    athleteName?: string
    athleteUserId?: string
    brandName?: string
    collectionYear: number
    totalUnits: number
    skuPrefix: string
    numberSelectionEnabled?: boolean
    automaticAssignmentEnabled?: boolean
    sizeSelectionEnabled?: boolean
    authenticityEnabled?: boolean
    publicRegistryEnabled?: boolean
    authenticationStatement?: string
    heroImageUrl?: string
    story?: string
    launchDate?: string
    endDate?: string
  }
  tiers: TierInput[]
}

// Creates Product + LimitedCollection + Tiers atomically. Does NOT generate
// units — that's a separate explicit admin action (see generateCollectionUnits)
// so an admin can fix tier ranges before committing to serialized inventory.
export async function createCollection(input: CreateCollectionInput) {
  const { seller, product, collection, tiers } = input

  if (collection.totalUnits <= 0) throw new CollectionValidationError(['totalUnits must be greater than 0'])
  const tierValidation = validateTiers(tiers, collection.totalUnits)
  if (!tierValidation.ok) throw new CollectionValidationError(tierValidation.errors)

  const slugBase = slugify(collection.slug || collection.name)
  const slug = await uniqueSlug(slugBase, async candidate =>
    (await prisma.limitedCollection.count({ where: { slug: candidate } })) > 0,
  )

  return prisma.$transaction(async tx => {
    const createdProduct = await tx.product.create({
      data: {
        sellerType: seller.sellerType,
        schoolId: seller.schoolId,
        name: product.name,
        description: product.description ?? null,
        price: product.price,
        currency: product.currency ?? 'EUR',
        imageUrl: product.imageUrl ?? null,
        categoryId: product.categoryId ?? null,
        isLimitedEdition: true,
        stock: null,
      },
    })

    const createdCollection = await tx.limitedCollection.create({
      data: {
        productId: createdProduct.id,
        sellerType: seller.sellerType,
        schoolId: seller.schoolId,
        name: collection.name,
        slug,
        status: CollectionStatus.DRAFT,
        athleteName: collection.athleteName ?? null,
        athleteUserId: collection.athleteUserId ?? null,
        brandName: collection.brandName ?? null,
        collectionYear: collection.collectionYear,
        totalUnits: collection.totalUnits,
        skuPrefix: collection.skuPrefix,
        numberSelectionEnabled: collection.numberSelectionEnabled ?? false,
        automaticAssignmentEnabled: collection.automaticAssignmentEnabled ?? true,
        sizeSelectionEnabled: collection.sizeSelectionEnabled ?? false,
        authenticityEnabled: collection.authenticityEnabled ?? true,
        publicRegistryEnabled: collection.publicRegistryEnabled ?? false,
        authenticationStatement: collection.authenticationStatement ?? null,
        heroImageUrl: collection.heroImageUrl ?? null,
        story: collection.story ?? null,
        launchDate: collection.launchDate ? new Date(collection.launchDate) : null,
        endDate: collection.endDate ? new Date(collection.endDate) : null,
        tiers: {
          create: tiers.map((t, i) => ({
            name: t.name,
            code: t.code,
            description: t.description ?? null,
            startNumber: t.startNumber,
            endNumber: t.endNumber,
            price: t.price ?? null,
            currency: t.currency ?? null,
            primaryColor: t.primaryColor,
            secondaryColor: t.secondaryColor,
            visualStyle: t.visualStyle ?? null,
            benefits: t.benefits ?? [],
            packagingDescription: t.packagingDescription ?? null,
            displayOrder: t.displayOrder ?? i,
          })),
        },
      },
      include: COLLECTION_INCLUDE,
    })

    return createdCollection
  })
}

interface UpdateCollectionInput {
  name?: string
  athleteName?: string | null
  athleteUserId?: string | null
  brandName?: string | null
  collectionYear?: number
  totalUnits?: number
  skuPrefix?: string
  numberSelectionEnabled?: boolean
  automaticAssignmentEnabled?: boolean
  sizeSelectionEnabled?: boolean
  authenticityEnabled?: boolean
  publicRegistryEnabled?: boolean
  authenticationStatement?: string | null
  heroImageUrl?: string | null
  story?: string | null
  launchDate?: string | null
  endDate?: string | null
  cardTemplateConfig?: Record<string, unknown>
}

export async function updateCollection(seller: SellerContext, id: string, patch: UpdateCollectionInput) {
  const existing = await getCollection(seller, id)
  if (!existing) return null

  return prisma.limitedCollection.update({
    where: { id },
    data: {
      ...patch,
      launchDate: patch.launchDate !== undefined ? (patch.launchDate ? new Date(patch.launchDate) : null) : undefined,
      endDate: patch.endDate !== undefined ? (patch.endDate ? new Date(patch.endDate) : null) : undefined,
      cardTemplateConfig: patch.cardTemplateConfig as Prisma.InputJsonValue | undefined,
    },
    include: COLLECTION_INCLUDE,
  })
}

interface ProductPatch {
  name?: string
  description?: string | null
  price?: number
  currency?: string
  imageUrl?: string | null
  categoryId?: string | null
  isActive?: boolean
}

// Edits the underlying Product row (name/price/image/description) from the
// collection builder — distinct from updateCollection, which only touches
// collection-specific fields (athlete, tiers config, card, etc).
export async function updateCollectionProduct(seller: SellerContext, collectionId: string, patch: ProductPatch) {
  const existing = await getCollection(seller, collectionId)
  if (!existing) return null
  return prisma.product.update({ where: { id: existing.productId }, data: patch })
}

export async function upsertTiers(seller: SellerContext, collectionId: string, tiers: (TierInput & { id?: string })[]) {
  const existing = await getCollection(seller, collectionId)
  if (!existing) return null

  const validation = validateTiers(tiers, existing.totalUnits)
  if (!validation.ok) throw new CollectionValidationError(validation.errors)

  // Once units exist, changing tier ranges could orphan already-generated
  // units from their assigned tier — block it rather than silently letting
  // a unit's tierId drift from the range it was generated under. Renaming
  // colors/benefits/price on existing tiers (not touching ranges) is still
  // allowed via the per-tier PATCH route.
  const unitCount = await prisma.collectibleUnit.count({ where: { collectionId } })
  if (unitCount > 0) {
    throw new CollectionValidationError(['Cannot change tier ranges after units have been generated — archive and recreate the collection instead'])
  }

  return prisma.$transaction(async tx => {
    await tx.limitedCollectionTier.deleteMany({ where: { collectionId } })
    await tx.limitedCollectionTier.createMany({
      data: tiers.map((t, i) => ({
        collectionId,
        name: t.name,
        code: t.code,
        description: t.description ?? null,
        startNumber: t.startNumber,
        endNumber: t.endNumber,
        price: t.price ?? null,
        currency: t.currency ?? null,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        visualStyle: t.visualStyle ?? null,
        benefits: t.benefits ?? [],
        packagingDescription: t.packagingDescription ?? null,
        displayOrder: t.displayOrder ?? i,
      })),
    })
    return tx.limitedCollectionTier.findMany({ where: { collectionId }, orderBy: { displayOrder: 'asc' } })
  })
}

export async function generateCollectionUnits(seller: SellerContext, collectionId: string) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null

  const validation = validateTiers(collection.tiers as TierRange[], collection.totalUnits)
  if (!validation.ok) throw new CollectionValidationError(validation.errors)

  return prisma.$transaction(tx =>
    generateUnitsDb(tx, {
      collectionId,
      totalUnits: collection.totalUnits,
      skuPrefix: collection.skuPrefix,
      tiers: collection.tiers,
    }),
  )
}

export interface PublishValidation {
  ok: boolean
  errors: string[]
}

// Everything that must be true before a collection is allowed to go LIVE.
export async function validateForPublish(seller: SellerContext, collectionId: string): Promise<PublishValidation> {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return { ok: false, errors: ['Collection not found'] }

  const errors: string[] = []
  if (collection.totalUnits <= 0) errors.push('Total units must be greater than 0')
  if (!collection.product.price || collection.product.price <= 0) {
    const hasTierPrices = collection.tiers.every(t => t.price != null && t.price > 0)
    if (!hasTierPrices) errors.push('Set a base product price, or a price on every tier')
  }
  const tierValidation = validateTiers(collection.tiers, collection.totalUnits)
  if (!tierValidation.ok) errors.push(...tierValidation.errors)

  const unitCount = await prisma.collectibleUnit.count({ where: { collectionId } })
  if (unitCount === 0) errors.push('No units generated yet')
  if (unitCount !== collection.totalUnits) errors.push(`${unitCount} units generated, expected ${collection.totalUnits}`)

  if (!collection.product.imageUrl && !collection.heroImageUrl) errors.push('Add a product image or hero image')

  return { ok: errors.length === 0, errors }
}

export async function publishCollection(seller: SellerContext, collectionId: string) {
  const validation = await validateForPublish(seller, collectionId)
  if (!validation.ok) throw new CollectionValidationError(validation.errors)

  return prisma.limitedCollection.update({
    where: { id: collectionId },
    data: { status: CollectionStatus.LIVE, launchDate: { set: undefined } },
    include: COLLECTION_INCLUDE,
  })
}

export async function unpublishCollection(seller: SellerContext, collectionId: string) {
  const existing = await getCollection(seller, collectionId)
  if (!existing) return null
  return prisma.limitedCollection.update({ where: { id: collectionId }, data: { status: CollectionStatus.DRAFT } })
}

// ── Units ────────────────────────────────────────────────────────────────────

export interface UnitFilters {
  tierId?: string
  status?: CollectibleUnitStatus
  size?: string
  signed?: boolean
  hasVideo?: boolean
  ownerUserId?: string
}

export async function listUnits(seller: SellerContext, collectionId: string, filters: UnitFilters = {}) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null

  return prisma.collectibleUnit.findMany({
    where: {
      collectionId,
      ...(filters.tierId && { tierId: filters.tierId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.size && { size: filters.size }),
      ...(filters.signed !== undefined && { signed: filters.signed }),
      ...(filters.hasVideo !== undefined && { videoUrl: filters.hasVideo ? { not: null } : null }),
      ...(filters.ownerUserId && { ownerUserId: filters.ownerUserId }),
    },
    include: {
      tier: true,
      owner: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, status: true, total: true, currency: true, createdAt: true } },
    },
    orderBy: { editionNumber: 'asc' },
  })
}

export interface UnitPatch {
  size?: string | null
  specificPrice?: number | null
  currency?: string | null
  status?: CollectibleUnitStatus
  signed?: boolean
  signedAt?: string | null
  signedLocation?: string | null
  videoUrl?: string | null
  certificateUrl?: string | null
}

export async function updateUnit(seller: SellerContext, collectionId: string, unitId: string, patch: UnitPatch) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null

  const unit = await prisma.collectibleUnit.findFirst({ where: { id: unitId, collectionId } })
  if (!unit) return null

  // A sold/authenticated unit can still have its signature/video/certificate
  // filled in after the fact, but its status can't be hand-edited back to
  // AVAILABLE — that would silently resell something someone already owns.
  // Use admin-reserve/archive actions for legitimate status changes instead.
  const data: Prisma.CollectibleUnitUpdateInput = { ...patch }
  if ((unit.status === CollectibleUnitStatus.SOLD || unit.status === CollectibleUnitStatus.AUTHENTICATED) && patch.status) {
    if (patch.status === CollectibleUnitStatus.AVAILABLE || patch.status === CollectibleUnitStatus.RESERVED) {
      throw new CollectionValidationError(['Cannot move a sold unit back to available/reserved'])
    }
  }
  if (patch.signedAt !== undefined) data.signedAt = patch.signedAt ? new Date(patch.signedAt) : null

  return prisma.collectibleUnit.update({ where: { id: unitId }, data })
}

export async function bulkUpdateUnits(seller: SellerContext, collectionId: string, unitIds: string[], patch: UnitPatch) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null

  const data: Prisma.CollectibleUnitUpdateManyMutationInput = { ...patch }
  if (patch.signedAt !== undefined) data.signedAt = patch.signedAt ? new Date(patch.signedAt) : null
  // Bulk edit never touches status — status changes to SOLD/RESERVED must go
  // through the purchase/reservation flow, and archiving a batch is its own
  // explicit action, not lumped into "bulk edit size/price/signed".
  delete (data as { status?: unknown }).status

  return prisma.collectibleUnit.updateMany({
    where: { id: { in: unitIds }, collectionId },
    data,
  })
}

export async function archiveUnit(seller: SellerContext, collectionId: string, unitId: string) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null
  const unit = await prisma.collectibleUnit.findFirst({ where: { id: unitId, collectionId } })
  if (!unit) return null
  // Sold/authenticated units are never destructively removed, only archived
  // (still queryable, still owned) — matches "no eliminar registros vendidos".
  return prisma.collectibleUnit.update({ where: { id: unitId }, data: { status: CollectibleUnitStatus.ARCHIVED } })
}

export async function adminReserveUnit(seller: SellerContext, collectionId: string, unitId: string) {
  const collection = await getCollection(seller, collectionId)
  if (!collection) return null
  const claim = await prisma.collectibleUnit.updateMany({
    where: { id: unitId, collectionId, status: CollectibleUnitStatus.AVAILABLE },
    data: { status: CollectibleUnitStatus.RESERVED, reservedAt: new Date(), reservationExpiresAt: null },
  })
  if (claim.count === 0) return null
  return prisma.collectibleUnit.findUnique({ where: { id: unitId } })
}
