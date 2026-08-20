import { NextRequest, NextResponse } from 'next/server'
import { authoriseAdminMarketplace } from '@/lib/auth/marketplaceAuth'
import { listUnits, type UnitFilters } from '@/lib/services/collectibles/collectionService'
import { CollectibleUnitStatus } from '@/lib/prisma-client/enums'

// GET /api/admin/marketplace/collections/[id]/units?tierId=&status=&size=&signed=&hasVideo=&ownerUserId=
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseAdminMarketplace()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const sp = req.nextUrl.searchParams
  const filters: UnitFilters = {
    tierId: sp.get('tierId') ?? undefined,
    status: (sp.get('status') as CollectibleUnitStatus) ?? undefined,
    size: sp.get('size') ?? undefined,
    signed: sp.has('signed') ? sp.get('signed') === 'true' : undefined,
    hasVideo: sp.has('hasVideo') ? sp.get('hasVideo') === 'true' : undefined,
    ownerUserId: sp.get('ownerUserId') ?? undefined,
  }

  const units = await listUnits(auth.seller, id, filters)
  if (units === null) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  return NextResponse.json({ units })
}
