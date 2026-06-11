import { prisma } from '@/lib/db'
import { getPermissions, type Permission } from './permissions'
import type { SchoolMemberRole } from '../prisma-client'

export type SchoolContext = {
  schoolId: string
  schoolName: string
  schoolSlug: string
  role: SchoolMemberRole
  permissions: Permission[]
}

export type UserContexts = {
  isAdmin: boolean
  schools: SchoolContext[]
  currentSchoolId: string | null
}

// Core function — builds all available contexts for a user.
// Authorization source: SchoolMember table. Never trust cookie alone.
export async function getUserContexts(userId: string, lastSchoolId?: string | null): Promise<UserContexts> {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.schoolMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { school: { select: { id: true, name: true, slug: true } } },
    }),
  ])

  const schools: SchoolContext[] = memberships
    .filter(m => m.school)
    .map(m => ({
      schoolId: m.school.id,
      schoolName: m.school.name,
      schoolSlug: m.school.slug,
      role: m.role,
      permissions: getPermissions(m.role),
    }))

  // Resolve currentSchoolId: prefer lastSchoolId if still valid
  const validLast = lastSchoolId ? schools.find(s => s.schoolId === lastSchoolId) : null
  const currentSchoolId = validLast?.schoolId ?? schools[0]?.schoolId ?? null

  return {
    isAdmin: user?.role === 'SUPERADMIN',
    schools,
    currentSchoolId,
  }
}

// Validates a user has a specific role in a school. Use in every API route.
export async function getSchoolMembership(userId: string, schoolId: string) {
  return prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
    select: { role: true, status: true },
  })
}

// Guard: throws if user has no active membership in the school.
export async function requireSchoolAccess(userId: string, schoolId: string) {
  const member = await getSchoolMembership(userId, schoolId)
  if (!member || member.status !== 'ACTIVE') {
    throw new Error('FORBIDDEN')
  }
  return member
}
