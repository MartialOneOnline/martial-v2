/**
 * Seeds Marcus "Buchecha" Almeida's Legacy Kimono Collection — the first
 * launch on the general Limited Collections system (see
 * apps/web/lib/services/collectibles/ and prisma/schema.prisma's
 * LimitedCollection/LimitedCollectionTier/CollectibleUnit models).
 *
 * Sold directly by Martial (sellerType MARTIAL, no school involved) — see
 * the MarketplaceSellerType enum and apps/web/app/api/webhooks/stripe-platform/route.ts.
 *
 * Idempotent: safe to run repeatedly.
 *  - Product/Collection: upserted by the collection's unique slug.
 *  - Tiers: upserted by (collectionId, code).
 *  - Units: only missing edition numbers (1..50) are created — an existing
 *    unit's size/price/video/order/owner/status is never touched, matching
 *    the same-shaped idempotent generator used by the admin "Generate units"
 *    action (apps/web/lib/services/collectibles/unitGenerator.ts).
 *
 * Deliberately left DRAFT with placeholder pricing (price 0, no tier
 * prices) — final price, sizes, shipping, launch date and commercial images
 * are still pending and must be set from Admin before this collection can
 * be published (publishCollection() blocks on exactly this).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-buchecha-collection.ts
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../apps/web/lib/prisma-client/client.js'
import { generateSku, generateVerificationCode } from '../apps/web/lib/services/collectibles/verification'
import { resolveTierForNumber, validateTiers, type TierRange } from '../apps/web/lib/services/collectibles/tiers'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

const COLLECTION_SLUG = 'buchecha-legacy-kimono'
const TOTAL_UNITS = 50
const SKU_PREFIX = 'BUC-LEGACY-2026'

const AUTHENTICATION_STATEMENT =
  "This certifies that kimono #{{displayNumber}} from the Martial Legacy Collection was personally signed by Marcus 'Buchecha' Almeida."

const TIERS: (TierRange & {
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  visualStyle: string
  packagingDescription: string
  displayOrder: number
})[] = [
  {
    code: 'CHAMPION', name: 'Champion Edition',
    startNumber: 1, endNumber: 10,
    description: 'The first 10 kimonos of the collection — premium finish.',
    primaryColor: '#D4AF37', secondaryColor: '#8B6F1F', visualStyle: 'gold-premium',
    packagingDescription: 'Special packaging — details to be configured from Admin.',
    displayOrder: 0,
  },
  {
    code: 'SIGNATURE', name: 'Signature Edition',
    startNumber: 11, endNumber: 40,
    description: 'Silver and black identity.',
    primaryColor: '#C0C0C0', secondaryColor: '#111827', visualStyle: 'silver-black',
    packagingDescription: 'Standard collector packaging.',
    displayOrder: 1,
  },
  {
    code: 'COMMUNITY', name: 'Community Edition',
    startNumber: 41, endNumber: 50,
    description: 'Matte black finish.',
    primaryColor: '#1C1C1C', secondaryColor: '#3F3F46', visualStyle: 'matte-black',
    packagingDescription: 'Standard collector packaging.',
    displayOrder: 2,
  },
]

async function main() {
  const tierValidation = validateTiers(TIERS, TOTAL_UNITS)
  if (!tierValidation.ok) {
    console.error('Tier configuration is invalid:', tierValidation.errors)
    process.exitCode = 1
    return
  }

  let productCreated = false
  let collectionCreated = false

  let collection = await prisma.limitedCollection.findUnique({
    where: { slug: COLLECTION_SLUG },
    include: { tiers: true, product: true },
  })

  if (!collection) {
    const product = await prisma.product.create({
      data: {
        sellerType: 'MARTIAL',
        schoolId: null,
        name: 'Marcus "Buchecha" Almeida — Legacy Kimono Collection',
        description:
          "A signed and individually numbered limited-edition kimono created with Marcus 'Buchecha' Almeida. " +
          'Each piece includes a unique Legacy Card, digital authentication and an exclusive collector record.',
        price: 0, // placeholder — real price pending, set from Admin (blocks publish until set)
        currency: 'EUR',
        isActive: true,
        isLimitedEdition: true,
      },
    })
    productCreated = true

    collection = await prisma.limitedCollection.create({
      data: {
        productId: product.id,
        sellerType: 'MARTIAL',
        schoolId: null,
        name: 'Marcus "Buchecha" Almeida — Legacy Kimono Collection',
        slug: COLLECTION_SLUG,
        status: 'DRAFT',
        athleteName: 'Marcus "Buchecha" Almeida',
        athleteUserId: null,
        brandName: 'Martial Legacy Collection',
        collectionYear: 2026,
        totalUnits: TOTAL_UNITS,
        skuPrefix: SKU_PREFIX,
        numberSelectionEnabled: false,
        automaticAssignmentEnabled: true,
        sizeSelectionEnabled: true,
        authenticityEnabled: true,
        publicRegistryEnabled: false,
        authenticationStatement: AUTHENTICATION_STATEMENT,
        cardTemplateConfig: {},
      },
      include: { tiers: true, product: true },
    })
    collectionCreated = true
  }

  // ── Tiers: upsert by (collectionId, code) — never overwrite price/benefits
  // an admin may have already edited, only the structural range/name/color
  // defaults on first creation. ─────────────────────────────────────────────
  const tierIds: Record<string, string> = {}
  let tiersCreated = 0
  let tiersExisting = 0
  for (const t of TIERS) {
    const existing = collection.tiers.find(existingTier => existingTier.code === t.code)
    if (existing) {
      tierIds[t.code] = existing.id
      tiersExisting++
      continue
    }
    const created = await prisma.limitedCollectionTier.create({
      data: {
        collectionId: collection.id,
        name: t.name,
        code: t.code,
        description: t.description,
        startNumber: t.startNumber,
        endNumber: t.endNumber,
        price: null, // pending — set from Admin
        currency: null,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        visualStyle: t.visualStyle,
        benefits: [],
        packagingDescription: t.packagingDescription,
        displayOrder: t.displayOrder,
      },
    })
    tierIds[t.code] = created.id
    tiersCreated++
  }

  // ── Units: only missing edition numbers, idempotent ─────────────────────────
  const existingUnits = await prisma.collectibleUnit.findMany({
    where: { collectionId: collection.id },
    select: { editionNumber: true },
  })
  const existingNumbers = new Set(existingUnits.map(u => u.editionNumber))

  const byTier: Record<string, number> = {}
  const toCreate: Parameters<typeof prisma.collectibleUnit.createMany>[0]['data'] = []
  const usedCodes = new Set<string>()
  const errors: string[] = []

  for (let editionNumber = 1; editionNumber <= TOTAL_UNITS; editionNumber++) {
    if (existingNumbers.has(editionNumber)) continue
    const tier = resolveTierForNumber(TIERS, editionNumber)
    if (!tier) { errors.push(`No tier covers edition number ${editionNumber}`); continue }

    let code = generateVerificationCode()
    while (usedCodes.has(code)) code = generateVerificationCode()
    usedCodes.add(code)

    toCreate.push({
      collectionId: collection.id,
      tierId: tierIds[tier.code]!,
      editionNumber,
      sku: generateSku(SKU_PREFIX, editionNumber, TOTAL_UNITS),
      publicVerificationCode: code,
      status: 'AVAILABLE',
    })
    byTier[tier.code] = (byTier[tier.code] ?? 0) + 1
  }

  if (toCreate.length > 0) {
    await prisma.collectibleUnit.createMany({ data: toCreate })
  }

  console.log('─'.repeat(60))
  console.log(`Product:    ${productCreated ? 'CREATED' : 'already existed'}`)
  console.log(`Collection: ${collectionCreated ? 'CREATED' : 'already existed'} (status=${collection.status}, id=${collection.id})`)
  console.log(`Tiers:      ${tiersCreated} created, ${tiersExisting} already existed`)
  console.log(`Units:      ${toCreate.length} created, ${existingNumbers.size} already existed`)
  console.log(`  Champion units created:  ${byTier.CHAMPION ?? 0}`)
  console.log(`  Signature units created: ${byTier.SIGNATURE ?? 0}`)
  console.log(`  Community units created: ${byTier.COMMUNITY ?? 0}`)
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`)
    errors.forEach(e => console.log(`  - ${e}`))
  }
  console.log('─'.repeat(60))
  console.log('Still pending (edit from Admin before publishing): price, sizes, launch date, shipping, final images.')
}

main().finally(() => prisma.$disconnect())
