import { prisma } from '@/lib/db'

// A waiver is "blocking" a member from booking when it was sent to them
// (a UserWaiver row exists) but is not currently valid — either never
// signed, or signed once and then revoked (e.g. a "require re-signature"
// template update). Only active Waiver templates count, so deactivating a
// template immediately lifts the restriction it was enforcing.
export async function getBlockingWaivers(userId: string, schoolId: string) {
  return prisma.userWaiver.findMany({
    where: {
      userId,
      waiver: { schoolId, isActive: true },
      requiresSignatureToBook: true,
      OR: [{ signedAt: null }, { revokedAt: { not: null } }],
    },
    select: { id: true, waiver: { select: { id: true, title: true } } },
  })
}

// Waiver.version is a free-text field ("1.0", "1.1", …) bumped only when a
// template's content is edited after at least one member has already
// signed it — see PATCH /api/dashboard/waivers/templates/[id]. Not a strict
// semver: just needs to change so UserWaiver.signedVersion can record which
// text a given signature actually covered.
export function bumpVersion(version: string): string {
  const n = parseFloat(version)
  if (Number.isNaN(n)) return `${version}.1`
  return (Math.round((n + 0.1) * 10) / 10).toFixed(1)
}
