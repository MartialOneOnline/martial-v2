import { prisma } from '@/lib/db'
import { getPermissions, hasPermission, type Permission } from './permissions'
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

// The one staff gate for dashboard pages and /api/dashboard/** routes.
//   - STUDENT never passes, whatever the matrix says about it.
//   - CUSTOM (school-defined StaffRole) passes only with `permission` among
//     its own toggles — exactly what the school switched on, nothing more.
//   - A base staff role passes by `legacyBaseRoles` when the route still keeps
//     its historic hand-written role list (kept as-is so base roles behave
//     exactly as before), otherwise by the fixed permission matrix.
// The caller has already checked the member is ACTIVE in the current school
// (requireSchoolAccess / getSchoolMembership + status).
export async function staffCan(
  member: RoleBearer,
  permission: Permission,
  legacyBaseRoles?: readonly SchoolMemberRole[],
): Promise<boolean> {
  if (member.role === 'STUDENT') return false
  if (member.role === 'CUSTOM') return memberHasPermission(member, permission)
  if (legacyBaseRoles) return legacyBaseRoles.includes(member.role)
  return hasPermission(member.role, permission)
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
