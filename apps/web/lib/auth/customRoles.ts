import { prisma } from '@/lib/db'
import { getPermissions, type Permission } from './permissions'
import type { SchoolMemberRole } from '../prisma-client/enums'

export interface RoleBearer {
  role: SchoolMemberRole
  customRoleId: string | null
}

// Resolves the real permission set for a SchoolMember: the fixed matrix for
// any of the 7 base roles, or the school-defined StaffRole's own toggles when
// role is CUSTOM. Base roles are unaffected by this — see permissions.ts.
export async function getMemberPermissions(member: RoleBearer): Promise<Permission[]> {
  if (member.role !== 'CUSTOM') return getPermissions(member.role)
  if (!member.customRoleId) return []

  const staffRole = await prisma.staffRole.findUnique({
    where: { id: member.customRoleId },
    select: { permissions: true },
  })
  return Array.isArray(staffRole?.permissions) ? (staffRole.permissions as Permission[]) : []
}

export async function memberHasPermission(member: RoleBearer, permission: Permission): Promise<boolean> {
  const permissions = await getMemberPermissions(member)
  return permissions.includes(permission)
}

const BASE_ROLE_IDS: SchoolMemberRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST', 'STUDENT']

// Resolves a role picker's selected `roleId` (a base SchoolMemberRole string,
// or a StaffRole cuid) into what SchoolMember.role/customRoleId should be set
// to. Returns null if roleId names a custom role that doesn't belong to this
// school (or doesn't exist) — callers should treat that as a 400.
export async function resolveRoleAssignment(
  schoolId: string,
  roleId: string
): Promise<RoleBearer | null> {
  if ((BASE_ROLE_IDS as string[]).includes(roleId)) {
    return { role: roleId as SchoolMemberRole, customRoleId: null }
  }
  const staffRole = await prisma.staffRole.findUnique({ where: { id: roleId }, select: { id: true, schoolId: true } })
  if (!staffRole || staffRole.schoolId !== schoolId) return null
  return { role: 'CUSTOM', customRoleId: staffRole.id }
}
