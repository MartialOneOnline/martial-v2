import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// PATCH /api/dashboard/transactions/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const { status } = body

  const allowed = ['PAID', 'PENDING', 'FAILED']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // TODO(phase-5-refunds): implement compensating transaction + membership void
  // before allowing REFUNDED status transitions.
  if (status === 'REFUNDED') {
    return NextResponse.json(
      { error: 'Refunds require Phase 5 accounting workflow.' },
      { status: 403 },
    )
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, schoolId: auth.schoolId },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}

// DELETE /api/dashboard/transactions/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  const tx = await prisma.transaction.findFirst({
    where: { id, schoolId: auth.schoolId },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // TODO(phase-5-audit-trail): replace hard delete with soft delete (deletedAt/deletedBy)
  // and restrict deletion to PENDING/FAILED only once audit trail is implemented.
  if (['PAID', 'REFUNDED'].includes(tx.status)) {
    return NextResponse.json(
      { error: 'Paid transactions cannot be deleted. Use Phase 5 refund workflow.' },
      { status: 403 },
    )
  }

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
