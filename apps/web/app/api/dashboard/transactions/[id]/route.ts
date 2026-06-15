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

  const allowed = ['PAID', 'PENDING', 'FAILED', 'REFUNDED']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
