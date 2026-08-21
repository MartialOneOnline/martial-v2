import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../../_authorise'
import { notifyWaiverSigned } from '@/lib/notifications/create'

// POST /api/dashboard/waivers/[id]/mark-signed — staff records an in-person
// / paper signature. No digital signature or PDF is captured this way; the
// required note is the audit trail for a physical document kept offline.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { note } = await req.json()
  if (!note?.trim()) return NextResponse.json({ error: 'A note is required for manual/paper signatures' }, { status: 400 })

  const userWaiver = await prisma.userWaiver.findUnique({
    where: { id },
    include: { waiver: { select: { schoolId: true, title: true } }, user: { select: { name: true, email: true } } },
  })
  if (!userWaiver || userWaiver.waiver.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.userWaiver.update({
    where: { id },
    data: {
      signedAt: new Date(),
      sentVia: 'MANUAL',
      revokedAt: null,
      notes: userWaiver.notes ? `${userWaiver.notes}\n${note.trim()}` : note.trim(),
    },
  })

  notifyWaiverSigned(auth.schoolId, userWaiver.user.name ?? userWaiver.user.email, userWaiver.waiver.title)

  return NextResponse.json({ success: true })
}
