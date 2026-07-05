import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// DELETE /api/admin/invitations/[id] — remove an invitation from the pipeline
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const invitation = await prisma.schoolInvitation.findUnique({ where: { id } })
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.schoolInvitation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
