import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import UsersClient from './UsersClient'
import { getAuthUser } from '@/lib/auth/server'
import { getSchoolMembership } from '@/lib/auth/contexts'

export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageContent />
    </Suspense>
  )
}

async function UsersPageContent() {
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

  const students = members.map(m => {
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

  // Members with an ACTIVE membership whose access status disagrees (e.g.
  // stuck INACTIVE) — surfaced as an OWNER/ADMIN-only banner below. Computed
  // from data already fetched above, no extra query needed.
  //
  // PENDING/LEAD are deliberately excluded: Invite User can assign a trial
  // plan before the invite is accepted (assignPlan called with
  // activateMember: false — see members/invite/route.ts), so a not-yet-
  // accepted invite legitimately sits at PENDING/LEAD with an ACTIVE trial
  // Membership. That's the intended steady state, not drift. Mirrors the
  // same candidate set as findMembershipStatusDrift() in
  // lib/services/membership.ts (used by the superadmin panel) — this page
  // computes it locally instead of calling that function only because the
  // membership data is already fetched above.
  const driftedMembers = students
    .filter(s => s.activeMembership && ['INACTIVE', 'FROZEN', 'ARCHIVED'].includes(s.status))
    .map(s => ({ id: s.id, name: s.name, status: s.status }))

  let canViewDrift = false
  if (driftedMembers.length > 0) {
    const viewer = await getAuthUser()
    if (viewer) {
      canViewDrift = viewer.role === 'SUPERADMIN'
        || ['OWNER', 'ADMIN'].includes((await getSchoolMembership(viewer.id, schoolId))?.role ?? '')
    }
  }

  return <UsersClient students={students} driftedMembers={canViewDrift ? driftedMembers : []} />
}
