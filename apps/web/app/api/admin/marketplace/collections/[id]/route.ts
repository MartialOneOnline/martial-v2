import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { getCollection, updateCollection, updateCollectionProduct, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// GET /api/admin/marketplace/collections/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const collection = await getCollection(auth.seller, id)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  return NextResponse.json(collection)
}

// PATCH /api/admin/marketplace/collections/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const { product, ...collectionPatch } = body

  try {
    if (product) await updateCollectionProduct(auth.seller, id, product)
    const updated = await updateCollection(auth.seller, id, collectionPatch)
    if (!updated) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    throw err
  }
}
