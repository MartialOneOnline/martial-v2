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
    where: { schoolId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  const students = members.map(m => ({
    id: m.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl ?? null,
    belt: m.belt ?? 'Blanco',
    beltDegree: m.beltDegree ?? 0,
    status: m.status,
    role: m.role,
    joinedAt: m.joinedAt?.toISOString() ?? null,
  }))

  return <UsersClient students={students} />
}
