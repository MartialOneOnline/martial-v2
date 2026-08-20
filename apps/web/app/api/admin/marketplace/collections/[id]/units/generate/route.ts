import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { generateCollectionUnits, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// POST /api/admin/marketplace/collections/[id]/units/generate — idempotent
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  try {
    const result = await generateCollectionUnits(auth.seller, id)
    if (!result) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    throw err
  }
}
