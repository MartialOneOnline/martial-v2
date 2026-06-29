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
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role))
        return { error: 'Forbidden', status: 403 }
    } catch { return { error: 'Forbidden', status: 403 } }
  }
  return { schoolId }
}

// GET /api/dashboard/notifications
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { schoolId: auth.schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { schoolId: auth.schoolId, read: false },
    }),
  ])

  return NextResponse.json({ notifications, unread })
}

// PATCH /api/dashboard/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const { id } = body

  if (id) {
    // Mark single notification as read
    await prisma.notification.updateMany({
      where: { id, schoolId: auth.schoolId },
      data: { read: true },
    })
  } else {
    // Mark all as read
    await prisma.notification.updateMany({
      where: { schoolId: auth.schoolId, read: false },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
}
