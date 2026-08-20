import type { Prisma } from '@/lib/prisma-client/client'
import { CollectibleUnitStatus } from '@/lib/prisma-client/enums'
import { generateSku, generateVerificationCode } from './verification'
import { resolveTierForNumber, type TierRange } from './tiers'

export interface GenerateUnitsResult {
  createdCount: number
  existingCount: number
  byTier: Record<string, number> // tier code -> units created in this run
  errors: string[]
}

// Idempotent: only creates units for edition numbers that don't already
// exist for this collection. Never updates size/price/video/order/owner/
// status on an existing unit — a re-run after an admin has started editing
// generated units (or after new tiers were added) only fills in the gaps.
// Call inside a $transaction so the read-existing + create-missing pair is
// atomic against a concurrent duplicate "Generate" click.
export async function generateUnits(
  tx: Prisma.TransactionClient,
  params: {
    collectionId: string
    totalUnits: number
    skuPrefix: string
    tiers: (TierRange & { id: string })[]
  },
): Promise<GenerateUnitsResult> {
  const { collectionId, totalUnits, skuPrefix, tiers } = params
  const errors: string[] = []

  const existing = await tx.collectibleUnit.findMany({
    where: { collectionId },
    select: { editionNumber: true },
  })
  const existingNumbers = new Set(existing.map(u => u.editionNumber))

  const toCreate: Prisma.CollectibleUnitCreateManyInput[] = []
  const usedCodes = new Set<string>()
  const byTier: Record<string, number> = {}

  for (let editionNumber = 1; editionNumber <= totalUnits; editionNumber++) {
    if (existingNumbers.has(editionNumber)) continue

    const tier = resolveTierForNumber(tiers, editionNumber)
    if (!tier) {
      errors.push(`No tier covers edition number ${editionNumber} — skipped`)
      continue
    }

    let code = generateVerificationCode()
    while (usedCodes.has(code)) code = generateVerificationCode() // astronomically unlikely, cheap to guard anyway
    usedCodes.add(code)

    toCreate.push({
      collectionId,
      tierId: tier.id,
      editionNumber,
      sku: generateSku(skuPrefix, editionNumber, totalUnits),
      publicVerificationCode: code,
      status: CollectibleUnitStatus.AVAILABLE,
    })
    byTier[tier.code] = (byTier[tier.code] ?? 0) + 1
  }

  if (toCreate.length > 0) {
    await tx.collectibleUnit.createMany({ data: toCreate })
  }

  return {
    createdCount: toCreate.length,
    existingCount: existingNumbers.size,
    byTier,
    errors,
  }
}
