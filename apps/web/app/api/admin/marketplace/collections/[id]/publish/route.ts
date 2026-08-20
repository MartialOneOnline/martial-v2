import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { publishCollection, unpublishCollection, validateForPublish, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// POST /api/admin/marketplace/collections/[id]/publish
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  try {
    const collection = await publishCollection(auth.seller, id)
    return NextResponse.json(collection)
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Cannot publish', details: err.errors }, { status: 400 })
    }
    throw err
  }
}

// GET — pre-flight validation
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const validation = await validateForPublish(auth.seller, id)
  return NextResponse.json(validation)
}

// DELETE — unpublish, back to DRAFT
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const collection = await unpublishCollection(auth.seller, id)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  return NextResponse.json(collection)
}
