import { NextRequest, NextResponse } from 'next/server'
import { authoriseSchoolMarketplace } from '@/lib/auth/marketplaceAuth'
import { updateUnit, archiveUnit, adminReserveUnit, CollectionValidationError } from '@/lib/services/collectibles/collectionService'

// PATCH /api/dashboard/marketplace/collections/[id]/units/[unitId]
// Body: { action: 'update', ...patch } | { action: 'archive' } | { action: 'reserve' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; unitId: string }> }) {
  // This app's permission set uses one 'manage' bucket per domain (see
  // events/campaigns) rather than splitting create/publish/inventory into
  // separate permissions, so unit edits are gated the same as everything else.
  const auth = await authoriseSchoolMarketplace('school.marketplace.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id, unitId } = await params
  const body = await req.json()
  const { action = 'update', ...patch } = body

  try {
    if (action === 'archive') {
      const result = await archiveUnit(auth.seller, id, unitId)
      if (!result) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
      return NextResponse.json(result)
    }
    if (action === 'reserve') {
      const result = await adminReserveUnit(auth.seller, id, unitId)
      if (!result) return NextResponse.json({ error: 'Unit not available to reserve' }, { status: 409 })
      return NextResponse.json(result)
    }
    const result = await updateUnit(auth.seller, id, unitId, patch)
    if (!result) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof CollectionValidationError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    throw err
  }
}
