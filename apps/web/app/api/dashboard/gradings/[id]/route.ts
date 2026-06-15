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

// DELETE /api/dashboard/gradings/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const grading = await prisma.grading.findFirst({
    where: { id: params.id, schoolId: auth.schoolId },
  })
  if (!grading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.grading.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
