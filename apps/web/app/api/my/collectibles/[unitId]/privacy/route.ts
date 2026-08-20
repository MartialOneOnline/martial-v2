import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// PATCH /api/my/collectibles/[unitId]/privacy — owner-only consent control
// for whether their name appears on the public verification page.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { unitId } = await params
  const { showOwnerPublicly, ownerDisplayName } = await req.json() as { showOwnerPublicly?: boolean; ownerDisplayName?: string }

  const ownership = await prisma.collectibleOwnership.findFirst({
    where: { collectibleUnitId: unitId, ownerUserId: user.id, isCurrent: true },
  })
  if (!ownership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.collectibleOwnership.update({
    where: { id: ownership.id },
    data: {
      ...(showOwnerPublicly !== undefined && { showOwnerPublicly }),
      ...(ownerDisplayName !== undefined && { ownerDisplayName: ownerDisplayName?.trim() || null }),
    },
  })
  return NextResponse.json({ showOwnerPublicly: updated.showOwnerPublicly, ownerDisplayName: updated.ownerDisplayName })
}
