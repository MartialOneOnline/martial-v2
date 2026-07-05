import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import type { Prisma } from '@/lib/prisma-client/client'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 } as const
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role))
        return { error: 'Forbidden', status: 403 } as const
    } catch { return { error: 'Forbidden', status: 403 } as const }
  }
  return { schoolId, userId: user.id }
}

// A notification is visible to a staff member if it's school-wide (no specific
// recipient) or if it's targeted at them personally.
function visibleTo(schoolId: string, userId: string): Prisma.NotificationWhereInput {
  return { schoolId, OR: [{ recipientUserId: null }, { recipientUserId: userId }] }
}

// GET /api/dashboard/notifications
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const before = searchParams.get('before') // cursor: createdAt ISO string, for "load more"

  const where = {
    ...visibleTo(auth.schoolId, auth.userId),
    ...(before && { createdAt: { lt: new Date(before) } }),
  }

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { ...visibleTo(auth.schoolId, auth.userId), read: false },
    }),
  ])

  return NextResponse.json({ notifications, unread, hasMore: notifications.length === limit })
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
      where: { id, ...visibleTo(auth.schoolId, auth.userId) },
      data: { read: true },
    })
  } else {
    // Mark all as read (only the ones visible to this user)
    await prisma.notification.updateMany({
      where: { ...visibleTo(auth.schoolId, auth.userId), read: false },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
}
