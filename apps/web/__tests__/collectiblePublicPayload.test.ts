/**
 * Tests for buildPublicVerificationPayload() — the sanitizer that guarantees
 * ownerUserId, video/certificate URLs, order info and internal ids can never
 * leak through GET /api/public/collectibles/verify/[code]. See
 * lib/services/collectibles/publicPayload.ts.
 */
import { describe, it, expect } from 'vitest'
import { buildPublicVerificationPayload, type VerificationSourceData } from '@/lib/services/collectibles/publicPayload'
import { CollectibleUnitStatus } from '@/lib/prisma-client/enums'

const base: VerificationSourceData = {
  unit: { editionNumber: 7, status: CollectibleUnitStatus.SOLD, signed: true, signedAt: new Date('2026-01-01'), signedLocation: 'São Paulo' },
  collection: {
    name: 'Legacy Kimono Collection', athleteName: 'Buchecha', brandName: 'Martial Legacy Collection',
    collectionYear: 2026, totalUnits: 50, heroImageUrl: null, authenticationStatement: 'Certified.',
  },
  tier: { name: 'Champion Edition', primaryColor: '#D4AF37', secondaryColor: '#8B6F1F' },
  product: { name: 'Legacy Kimono', imageUrl: 'https://example.com/kimono.jpg' },
  currentOwnership: null,
}

describe('buildPublicVerificationPayload()', () => {
  it('includes only allowlisted public fields', () => {
    const payload = buildPublicVerificationPayload(base)
    expect(payload).toEqual({
      displayNumber: '07/50',
      editionNumber: 7,
      totalUnits: 50,
      status: 'SOLD',
      signed: true,
      signedAt: '2026-01-01T00:00:00.000Z',
      signedLocation: 'São Paulo',
      collectionName: 'Legacy Kimono Collection',
      athleteName: 'Buchecha',
      brandName: 'Martial Legacy Collection',
      collectionYear: 2026,
      productName: 'Legacy Kimono',
      imageUrl: 'https://example.com/kimono.jpg',
      authenticationStatement: 'Certified.',
      tierName: 'Champion Edition',
      primaryColor: '#D4AF37',
      secondaryColor: '#8B6F1F',
      ownerDisplayName: null,
    })
  })

  it('never contains a video/certificate/owner-id field, regardless of input shape', () => {
    const payload = buildPublicVerificationPayload(base) as unknown as Record<string, unknown>
    expect(payload.videoUrl).toBeUndefined()
    expect(payload.certificateUrl).toBeUndefined()
    expect(payload.ownerUserId).toBeUndefined()
    expect(payload.orderId).toBeUndefined()
    expect(payload.publicVerificationCode).toBeUndefined()
  })

  it('omits the owner name when showOwnerPublicly is false', () => {
    const payload = buildPublicVerificationPayload({
      ...base,
      currentOwnership: { ownerDisplayName: 'John D.', showOwnerPublicly: false },
    })
    expect(payload.ownerDisplayName).toBeNull()
  })

  it('includes the owner name only when the owner opted in', () => {
    const payload = buildPublicVerificationPayload({
      ...base,
      currentOwnership: { ownerDisplayName: 'John D.', showOwnerPublicly: true },
    })
    expect(payload.ownerDisplayName).toBe('John D.')
  })
})
