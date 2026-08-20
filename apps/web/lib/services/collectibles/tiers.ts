export interface TierRange {
  id?: string
  code: string
  startNumber: number
  endNumber: number
}

export interface TierValidationResult {
  ok: boolean
  errors: string[]
}

// A collection's tiers must fully partition 1..totalUnits with no gaps and no
// overlaps — every edition number belongs to exactly one tier, so unit
// generation (unitGenerator.ts) always has a tier to assign. Called both from
// the dashboard/admin tier-editing API before allowing a save, and before
// allowing a collection to move to LIVE.
export function validateTiers(tiers: TierRange[], totalUnits: number): TierValidationResult {
  const errors: string[] = []

  if (totalUnits <= 0) {
    errors.push('totalUnits must be greater than 0')
    return { ok: false, errors }
  }
  if (tiers.length === 0) {
    errors.push('At least one tier is required')
    return { ok: false, errors }
  }

  const codes = new Set<string>()
  for (const tier of tiers) {
    if (!tier.code?.trim()) errors.push('Every tier needs a code')
    if (codes.has(tier.code)) errors.push(`Duplicate tier code: ${tier.code}`)
    codes.add(tier.code)

    if (!Number.isInteger(tier.startNumber) || !Number.isInteger(tier.endNumber)) {
      errors.push(`Tier ${tier.code}: startNumber/endNumber must be integers`)
      continue
    }
    if (tier.startNumber < 1 || tier.endNumber > totalUnits) {
      errors.push(`Tier ${tier.code}: range ${tier.startNumber}-${tier.endNumber} must fall within 1-${totalUnits}`)
    }
    if (tier.startNumber > tier.endNumber) {
      errors.push(`Tier ${tier.code}: startNumber (${tier.startNumber}) must be <= endNumber (${tier.endNumber})`)
    }
  }

  // Overlap check — sort by startNumber, compare each pair of neighbors.
  const sorted = [...tiers]
    .filter(t => Number.isInteger(t.startNumber) && Number.isInteger(t.endNumber))
    .sort((a, b) => a.startNumber - b.startNumber)

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const cur = sorted[i]!
    if (cur.startNumber <= prev.endNumber) {
      errors.push(`Tiers ${prev.code} (${prev.startNumber}-${prev.endNumber}) and ${cur.code} (${cur.startNumber}-${cur.endNumber}) overlap`)
    }
  }

  // Coverage check — every number 1..totalUnits must belong to exactly one tier.
  if (sorted.length > 0 && errors.length === 0) {
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    if (first.startNumber !== 1) {
      errors.push(`Numbering must start at 1 (first tier ${first.code} starts at ${first.startNumber})`)
    }
    if (last.endNumber !== totalUnits) {
      errors.push(`Numbering must end at ${totalUnits} (last tier ${last.code} ends at ${last.endNumber})`)
    }
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!
      const cur = sorted[i]!
      if (cur.startNumber !== prev.endNumber + 1) {
        errors.push(`Gap between tier ${prev.code} (ends ${prev.endNumber}) and tier ${cur.code} (starts ${cur.startNumber})`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

// Which tier a given edition number belongs to. Assumes tiers already passed
// validateTiers (full, non-overlapping coverage) — returns undefined only if
// called against an invalid/incomplete tier set.
export function resolveTierForNumber<T extends TierRange>(tiers: T[], editionNumber: number): T | undefined {
  return tiers.find(t => editionNumber >= t.startNumber && editionNumber <= t.endNumber)
}
