import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { listCollections, createCollection, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// GET /api/admin/marketplace/collections — Martial-owned collections (SUPERADMIN)
export async function GET() {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const collections = await listCollections(auth.seller)
  return NextResponse.json({ collections })
}

// POST /api/admin/marketplace/collections
export async function POST(req: NextRequest) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { product, collection, tiers } = body
  if (!product?.name?.trim()) return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
  if (!collection?.name?.trim()) return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
  if (!Array.isArray(tiers) || tiers.length === 0) return NextResponse.json({ error: 'At least one tier is required' }, { status: 400 })

  try {
    const created = await createCollection({ seller: auth.seller, product, collection, tiers })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    throw err
  }
}
