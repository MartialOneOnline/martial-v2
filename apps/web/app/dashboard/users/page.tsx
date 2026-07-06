import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <UsersClient students={[]} />

  const cookieStore = await cookies()
  const schoolId = cookieStore.get('currentSchoolId')?.value

  if (!schoolId) {
    // Try to find the user's school automatically
    const dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: user.id },
      select: { id: true },
    })
    if (!dbUser) return <UsersClient students={[]} />

    const membership = await prisma.schoolMember.findFirst({
      where: { userId: dbUser.id },
      select: { schoolId: true },
    })
    if (!membership) return <UsersClient students={[]} />

    return <UsersPageWithSchool schoolId={membership.schoolId} />
  }

  return <UsersPageWithSchool schoolId={schoolId} />
}

async function UsersPageWithSchool({ schoolId }: { schoolId: string }) {
  const members = await prisma.schoolMember.findMany({
    where: { schoolId, role: 'STUDENT' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  const userIds = members.map(m => m.userId)
  const [activeMemberships, usageCounts] = await Promise.all([
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
  ])

  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))
  const membershipByUser: Record<string, typeof activeMemberships[0]> = {}
  for (const m of activeMemberships) {
    if (!membershipByUser[m.userId]) membershipByUser[m.userId] = m
  }

  const students = members.map(m => {
    const mem = membershipByUser[m.userId]
    const classAccess = mem?.plan?.classAccess as { globalLimit?: string } | null
    const totalLimit = classAccess?.globalLimit ? parseInt(classAccess.globalLimit) || null : null
    return {
      id: m.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      belt: m.belt ?? 'Blanco',
      beltDegree: m.beltDegree ?? 0,
      status: m.status,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
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

  return <UsersClient students={students} />
}
