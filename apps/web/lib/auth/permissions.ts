import type { SchoolMemberRole } from '../prisma-client/enums'

export type Permission =
  | 'school.profile.view'
  | 'school.profile.edit'
  | 'school.classes.view'
  | 'school.classes.manage'
  | 'school.bookings.view'
  | 'school.bookings.manage'
  | 'school.members.view'
  | 'school.members.manage'
  | 'school.memberships.view'
  | 'school.memberships.manage'
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
  'school.classes.view', 'school.classes.manage',
  'school.bookings.view', 'school.bookings.manage',
  'school.members.view', 'school.members.manage',
  'school.memberships.view', 'school.memberships.manage',
  'school.leads.view', 'school.leads.manage',
  'school.payments.view', 'school.payments.manage',
  'school.staff.view', 'school.staff.manage',
  'school.analytics.view',
  'school.settings.view', 'school.settings.manage',
  'school.waivers.manage', 'school.gradings.manage',
]

// Role → permission preset. Authorization always verified against SchoolMember.
export const ROLE_PERMISSIONS: Record<SchoolMemberRole, Permission[]> = {
  OWNER: ALL,

  ADMIN: ALL,

  MANAGER: ALL.filter(p => p !== 'school.staff.manage' && p !== 'school.settings.manage'),

  INSTRUCTOR: [
    'school.profile.view',
    'school.classes.view', 'school.classes.manage',
    'school.bookings.view', 'school.bookings.manage',
    'school.members.view',
    'school.memberships.view',
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
