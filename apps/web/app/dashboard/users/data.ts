import { cache } from 'react'
import { prisma } from '@/lib/db'

// Shared by page.tsx (list route) and layout.tsx (split-view list panel) —
// wrapped in React's cache() so both call sites within the same request
// dedupe to a single DB round trip instead of querying twice.
export const getStudentsForSchool = cache(async (schoolId: string) => {
  const members = await prisma.schoolMember.findMany({
    where: { schoolId, role: 'STUDENT' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, supabaseAuthId: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  const userIds = members.map(m => m.userId)
  const [activeMemberships, usageCounts, lastSeenRows] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: { in: userIds }, schoolId, status: 'ACTIVE' },
      include: { plan: { select: { name: true, classAccess: true } } },
      orderBy: { startDate: 'desc' },
    }),
    prisma.booking.groupBy({
      by: ['membershipId'],
      where: { userId: { in: userIds }, status: { not: 'CANCELLED' } },
      _count: { id: true },
    }),
    prisma.booking.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'COMPLETED' },
      _max: { scheduledAt: true },
    }),
  ])

  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))
  const lastSeenMap = Object.fromEntries(lastSeenRows.map(r => [r.userId, r._max.scheduledAt]))
  const membershipByUser: Record<string, typeof activeMemberships[0]> = {}
  for (const m of activeMemberships) {
    if (!membershipByUser[m.userId]) membershipByUser[m.userId] = m
  }

  return members.map(m => {
    const mem = membershipByUser[m.userId]
    const classAccess = mem?.plan?.classAccess as { globalLimit?: string } | null
    const totalLimit = classAccess?.globalLimit ? parseInt(classAccess.globalLimit) || null : null
    return {
      id: m.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      hasLogin: m.user.supabaseAuthId != null,
      belt: m.belt ?? 'Blanco',
      beltDegree: m.beltDegree ?? 0,
      status: m.status,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      lastSeen: lastSeenMap[m.userId]?.toISOString() ?? null,
      activeMembership: mem ? {
        id: mem.id,
        planName: mem.plan?.name ?? mem.planName,
        status: mem.status,
        startDate: mem.startDate.toISOString(),
        endDate: mem.endDate?.toISOString() ?? null,
        price: Number(mem.price),
        currency: mem.currency,
        consumed: usageMap[mem.id] ?? mem.classesUsed,
        totalLimit,
      } : null,
    }
  })
})

export type StudentListItem = Awaited<ReturnType<typeof getStudentsForSchool>>[number]
