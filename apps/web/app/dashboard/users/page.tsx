import { requireDashboardAccess, getCurrentSchoolId } from '@/lib/auth/server'
import { prisma } from '@/lib/db'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  await requireDashboardAccess()
  const schoolId = await getCurrentSchoolId()

  if (!schoolId) return <UsersClient students={[]} />

  const members = await prisma.schoolMember.findMany({
    where: { schoolId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  const students = members.map(m => ({
    id: m.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    belt: m.belt ?? 'Blanco',
    beltDegree: m.beltDegree ?? 0,
    status: m.status,
    role: m.role,
    joinedAt: m.joinedAt?.toISOString() ?? null,
  }))

  return <UsersClient students={students} />
}
