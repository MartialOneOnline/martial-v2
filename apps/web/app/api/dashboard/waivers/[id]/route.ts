import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../_authorise'

// DELETE /api/dashboard/waivers/[id] — revoke a waiver send. Soft: keeps the
// UserWaiver row (and any prior signature/PDF) as an audit record, but
// marks it revoked so it immediately blocks booking again — see
// lib/waivers.ts#getBlockingWaivers. Re-sending the same template to the
// same member later clears revokedAt (see POST /api/dashboard/waivers).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const userWaiver = await prisma.userWaiver.findUnique({ where: { id }, include: { waiver: { select: { schoolId: true } } } })
  if (!userWaiver || userWaiver.waiver.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.userWaiver.update({ where: { id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ success: true })
}
