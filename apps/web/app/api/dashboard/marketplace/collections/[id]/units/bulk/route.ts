import { NextRequest, NextResponse } from 'next/server'
import { authoriseSchoolMarketplace } from '@/lib/auth/marketplaceAuth'
import { bulkUpdateUnits } from '@/lib/services/collectibles/collectionService'

// PATCH /api/dashboard/marketplace/collections/[id]/units/bulk
// Body: { unitIds: string[], size?, specificPrice?, currency?, signed?, signedAt?, signedLocation? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseSchoolMarketplace('school.marketplace.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const { unitIds, ...patch } = body
  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    return NextResponse.json({ error: 'unitIds is required' }, { status: 400 })
  }

  const result = await bulkUpdateUnits(auth.seller, id, unitIds, patch)
  if (!result) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  return NextResponse.json({ updated: result.count })
}
