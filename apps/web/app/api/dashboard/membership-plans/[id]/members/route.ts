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
    try { await requireSchoolAccess(user.id, schoolId) }
    catch { return { error: 'Forbidden', status: 403 } }
  }
  return { schoolId }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params

  const memberships = await prisma.membership.findMany({
    where: { planId: id, schoolId: auth.schoolId },
    include: {
      user: { select: { name: true, email: true, avatarUrl: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json({
    members: memberships.map(m => ({
      id:        m.id,
      userId:    m.userId,
      name:      m.user?.name     ?? '—',
      email:     m.user?.email    ?? '—',
      avatarUrl: m.user?.avatarUrl ?? null,
      status:    m.status,
      startDate: m.startDate.toISOString(),
      endDate:   m.endDate?.toISOString() ?? null,
      planName:  m.planName,
    })),
  })
}
