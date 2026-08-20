import { NextRequest, NextResponse } from 'next/server'
import { authoriseSchoolMarketplace } from '@/lib/auth/marketplaceAuth'
import { upsertTiers, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// PUT /api/dashboard/marketplace/collections/[id]/tiers — replaces the full tier set
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseSchoolMarketplace('school.marketplace.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const { tiers } = body
  if (!Array.isArray(tiers) || tiers.length === 0) return NextResponse.json({ error: 'At least one tier is required' }, { status: 400 })

  try {
    const result = await upsertTiers(auth.seller, id, tiers)
    if (!result) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    return NextResponse.json({ tiers: result })
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    throw err
  }
}
