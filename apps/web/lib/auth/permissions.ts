import type { SchoolMemberRole } from '../prisma-client/enums'

export type Permission =
  | 'school.profile.view'
  | 'school.profile.edit'
  | 'school.classes.view'
  | 'school.classes.create'
  | 'school.classes.update'
  | 'school.classes.delete'
  | 'school.bookings.view'
  | 'school.bookings.manage'
  | 'school.members.view'
  | 'school.members.create'
  | 'school.members.update'
  | 'school.members.import'
  | 'school.members.delete'
  | 'school.memberships.view'
  | 'school.memberships.manage'
  | 'school.membershipPlans.view'
  | 'school.membershipPlans.create'
  | 'school.membershipPlans.update'
  | 'school.membershipPlans.delete'
  | 'school.leads.view'
  | 'school.leads.manage'
  | 'school.payments.view'
  | 'school.payments.manage'
  | 'school.staff.view'
  | 'school.staff.manage'
  | 'school.analytics.view'
  | 'school.settings.view'
  | 'school.settings.manage'
  | 'school.waivers.manage'
  | 'school.gradings.manage'

const ALL: Permission[] = [
  'school.profile.view', 'school.profile.edit',
  'school.classes.view', 'school.classes.create', 'school.classes.update', 'school.classes.delete',
  'school.bookings.view', 'school.bookings.manage',
  'school.members.view', 'school.members.create', 'school.members.update', 'school.members.import', 'school.members.delete',
  'school.memberships.view', 'school.memberships.manage',
  'school.membershipPlans.view', 'school.membershipPlans.create', 'school.membershipPlans.update', 'school.membershipPlans.delete',
  'school.leads.view', 'school.leads.manage',
  'school.payments.view', 'school.payments.manage',
  'school.staff.view', 'school.staff.manage',
  'school.analytics.view',
  'school.settings.view', 'school.settings.manage',
  'school.waivers.manage', 'school.gradings.manage',
]

// Permissions that stay OWNER/ADMIN-only even for MANAGER — irreversible or
// bulk-impact actions (hard deletes, mass import) that must never be granted
// implicitly through a broad "manage" bucket. Widen this list deliberately,
// one permission at a time, not by handing MANAGER the parent permission.
const OWNER_ADMIN_ONLY: Permission[] = [
  'school.staff.manage',
  'school.settings.manage',
  'school.classes.delete',
  'school.members.delete',
  'school.members.import',
  'school.membershipPlans.delete',
]

// Role → permission preset. Authorization always verified against SchoolMember.
export const ROLE_PERMISSIONS: Record<SchoolMemberRole, Permission[]> = {
  OWNER: ALL,

  ADMIN: ALL,

  MANAGER: ALL.filter(p => !OWNER_ADMIN_ONLY.includes(p)),

  // Read-only on classes — creating/editing/deleting class definitions is a
  // MANAGER+ operational decision, not something an instructor does from the
  // dashboard. Instructors still manage their own bookings/attendance and
  // grade students (see school.bookings.* and school.gradings.manage).
  INSTRUCTOR: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
    'school.members.view',
    'school.memberships.view',
    'school.membershipPlans.view',
    'school.leads.view',
    'school.analytics.view',
    'school.gradings.manage',
  ],

  ASSISTANT_INSTRUCTOR: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
    'school.members.view',
  ],

  RECEPTIONIST: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
    'school.members.view',
    'school.leads.view', 'school.leads.manage',
  ],

  STUDENT: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view',
  ],
}

export function getPermissions(role: SchoolMemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(role: SchoolMemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
