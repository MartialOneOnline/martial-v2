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
  | 'school.events.view'
  | 'school.events.manage'
  | 'school.communications.manage'
  | 'school.notifications.view'
  | 'school.campaigns.view'
  | 'school.campaigns.manage'
  | 'school.marketplace.view'
  | 'school.marketplace.manage'

export const ALL_PERMISSIONS: Permission[] = [
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
  'school.events.view', 'school.events.manage',
  'school.communications.manage',
  'school.notifications.view',
  'school.campaigns.view', 'school.campaigns.manage',
  'school.marketplace.view', 'school.marketplace.manage',
]

// Permissions that stay OWNER/ADMIN-only even for MANAGER. Two distinct
// reasons land a permission here — keep both in mind before removing one:
//   1. Irreversible or bulk-impact actions (hard deletes, mass import) that
//      must never be granted implicitly through a broad "manage" bucket.
//   2. Migrated from a hand-rolled route allowlist that was already
//      OWNER/ADMIN-only before hasPermission() existed (school.events.*,
//      school.communications.manage) — preserved as-is rather than widened
//      during the migration; widen deliberately in a follow-up if desired.
const OWNER_ADMIN_ONLY: Permission[] = [
  'school.staff.manage',
  'school.settings.manage',
  'school.classes.delete',
  'school.members.delete',
  'school.members.import',
  'school.membershipPlans.delete',
  'school.events.view',
  'school.events.manage',
  'school.communications.manage',
  'school.campaigns.manage',
  // Creating/publishing paid limited collections carries the same
  // financial/legal weight as campaigns — same tier, MANAGER excluded.
  'school.marketplace.manage',
]

// Role → permission preset. Authorization always verified against SchoolMember.
export const ROLE_PERMISSIONS: Record<SchoolMemberRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,

  ADMIN: ALL_PERMISSIONS,

  MANAGER: ALL_PERMISSIONS.filter(p => !OWNER_ADMIN_ONLY.includes(p)),

  // Instructors are scoped to running their own classes: seeing the
  // schedule, taking attendance/bookings, and grading — not the school's
  // members list, leads, payments, or analytics. (2026-08-21: narrowed from
  // an earlier broader preset per school owner request.)
  INSTRUCTOR: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
    'school.gradings.manage',
  ],

  ASSISTANT_INSTRUCTOR: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
  ],

  // Front-desk role: check students into class, take payments/see the
  // transaction log, and manage the leads pipeline + member roster — but no
  // gradings, analytics, staff, or settings access.
  RECEPTIONIST: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view', 'school.bookings.manage',
    'school.members.view', 'school.members.create',
    'school.payments.view',
    'school.leads.view', 'school.leads.manage',
  ],

  STUDENT: [
    'school.profile.view',
    'school.classes.view',
    'school.bookings.view',
  ],

  // Never read directly — a CUSTOM member's real permissions come from their
  // StaffRole via lib/auth/customRoles.ts#getMemberPermissions, not this map.
  CUSTOM: [],
}

export function getPermissions(role: SchoolMemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(role: SchoolMemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
