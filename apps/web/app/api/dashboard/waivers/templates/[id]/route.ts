import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../../_authorise'
import { bumpVersion } from '@/lib/waivers'

// PATCH /api/dashboard/waivers/templates/[id] — edit a template's content,
// active flag, or force existing signers to re-sign.
// Body: { content?, isActive?, requireResign? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const waiver = await prisma.waiver.findUnique({
    where: { id },
    include: { _count: { select: { signedBy: { where: { signedAt: { not: null } } } } } },
  })
  if (!waiver || waiver.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { content, isActive, requireResign } = body as { content?: string; isActive?: boolean; requireResign?: boolean }

  const contentChanged = typeof content === 'string' && content.trim() && content.trim() !== waiver.content
  const hasSigners = waiver._count.signedBy > 0

  const updated = await prisma.waiver.update({
    where: { id },
    data: {
      ...(contentChanged && { content: content!.trim() }),
      ...(typeof isActive === 'boolean' && { isActive }),
      // Bumping the version doesn't affect anyone who already signed — their
      // UserWaiver.signedVersion/contentSnapshot stays pinned to what they
      // actually agreed to. It only matters for future sends and for the
      // "require re-signature" flow below.
      ...(contentChanged && hasSigners && { version: bumpVersion(waiver.version) }),
    },
  })

  // Explicitly force everyone who already signed this waiver back to
  // "pending" — re-triggers the booking restriction (getBlockingWaivers)
  // until they sign the updated text. Their prior signature/contentSnapshot
  // stays on the row untouched as the historical record.
  if (requireResign) {
    await prisma.userWaiver.updateMany({
      where: { waiverId: id, signedAt: { not: null } },
      data: { signedAt: null },
    })
  }

  return NextResponse.json({
    template: { id: updated.id, title: updated.title, content: updated.content, version: updated.version, isActive: updated.isActive, signedCount: waiver._count.signedBy },
  })
}
