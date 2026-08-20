import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { bulkUpdateUnits } from '@/lib/services/collectibles/collectionService'

// PATCH /api/admin/marketplace/collections/[id]/units/bulk
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
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
