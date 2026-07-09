/**
 * Tests for hasPermission()/getPermissions() — the single source of truth for
 * what a SchoolMember role can do. Dashboard routes gate on these instead of
 * hand-rolled role arrays (see project P1: unify dashboard access on
 * SchoolMember.role + hasPermission).
 *
 * Conservative-policy invariants (post Codex review): MANAGER can operate
 * day-to-day but must never gain irreversible/bulk-impact actions implicitly;
 * INSTRUCTOR is read-only on class definitions. See permissions.ts
 * OWNER_ADMIN_ONLY for the exhaustive list of what stays OWNER/ADMIN-only.
 */
import { describe, it, expect } from 'vitest'
import { hasPermission, getPermissions } from '@/lib/auth/permissions'

describe('hasPermission()', () => {
  it('MANAGER can operate classes/members/memberships day-to-day', () => {
    expect(hasPermission('MANAGER', 'school.classes.create')).toBe(true)
    expect(hasPermission('MANAGER', 'school.classes.update')).toBe(true)
    expect(hasPermission('MANAGER', 'school.members.create')).toBe(true)
    expect(hasPermission('MANAGER', 'school.members.update')).toBe(true)
    expect(hasPermission('MANAGER', 'school.memberships.manage')).toBe(true)
    expect(hasPermission('MANAGER', 'school.membershipPlans.create')).toBe(true)
    expect(hasPermission('MANAGER', 'school.membershipPlans.update')).toBe(true)
    expect(hasPermission('MANAGER', 'school.leads.manage')).toBe(true)
    expect(hasPermission('MANAGER', 'school.gradings.manage')).toBe(true)
  })

  it('MANAGER is denied every irreversible/bulk-impact action', () => {
    expect(hasPermission('MANAGER', 'school.classes.delete')).toBe(false)
    expect(hasPermission('MANAGER', 'school.members.delete')).toBe(false)
    expect(hasPermission('MANAGER', 'school.members.import')).toBe(false)
    expect(hasPermission('MANAGER', 'school.membershipPlans.delete')).toBe(false)
    expect(hasPermission('MANAGER', 'school.staff.manage')).toBe(false)
    expect(hasPermission('MANAGER', 'school.settings.manage')).toBe(false)
  })

  it('INSTRUCTOR is read-only on class definitions', () => {
    expect(hasPermission('INSTRUCTOR', 'school.classes.view')).toBe(true)
    expect(hasPermission('INSTRUCTOR', 'school.classes.create')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.classes.update')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.classes.delete')).toBe(false)
  })

  it('INSTRUCTOR can view but not create/update/delete members', () => {
    expect(hasPermission('INSTRUCTOR', 'school.members.view')).toBe(true)
    expect(hasPermission('INSTRUCTOR', 'school.members.create')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.members.update')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.members.delete')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.members.import')).toBe(false)
  })

  it('RECEPTIONIST can manage leads and bookings but not classes or members', () => {
    expect(hasPermission('RECEPTIONIST', 'school.leads.manage')).toBe(true)
    expect(hasPermission('RECEPTIONIST', 'school.bookings.manage')).toBe(true)
    expect(hasPermission('RECEPTIONIST', 'school.classes.create')).toBe(false)
    expect(hasPermission('RECEPTIONIST', 'school.members.create')).toBe(false)
  })

  it('ASSISTANT_INSTRUCTOR is limited to viewing + booking management', () => {
    expect(hasPermission('ASSISTANT_INSTRUCTOR', 'school.bookings.manage')).toBe(true)
    expect(hasPermission('ASSISTANT_INSTRUCTOR', 'school.classes.create')).toBe(false)
    expect(hasPermission('ASSISTANT_INSTRUCTOR', 'school.leads.view')).toBe(false)
  })

  it('OWNER and ADMIN have every permission, including destructive ones', () => {
    const all = getPermissions('OWNER')
    for (const p of all) {
      expect(hasPermission('ADMIN', p)).toBe(true)
    }
    expect(hasPermission('OWNER', 'school.classes.delete')).toBe(true)
    expect(hasPermission('OWNER', 'school.members.delete')).toBe(true)
    expect(hasPermission('OWNER', 'school.members.import')).toBe(true)
    expect(hasPermission('OWNER', 'school.membershipPlans.delete')).toBe(true)
    expect(hasPermission('OWNER', 'school.settings.manage')).toBe(true)
    expect(hasPermission('OWNER', 'school.staff.manage')).toBe(true)
  })

  it('STUDENT is read-only on its own scope', () => {
    expect(hasPermission('STUDENT', 'school.classes.view')).toBe(true)
    expect(hasPermission('STUDENT', 'school.classes.create')).toBe(false)
    expect(hasPermission('STUDENT', 'school.members.view')).toBe(false)
  })

  // Events/messages/notifications were migrated from hand-rolled route
  // allowlists that were already OWNER/ADMIN(-ish)-only before hasPermission()
  // existed. This migration preserves that behavior exactly rather than
  // widening it to the "MANAGER can operate" default used elsewhere — see
  // permissions.ts OWNER_ADMIN_ONLY comment and the PR report for the roles
  // this deliberately does NOT match (MANAGER on events/communications,
  // RECEPTIONIST on events/notifications, ASSISTANT_INSTRUCTOR on events).
  it('school.events.view is OWNER/ADMIN/INSTRUCTOR only — MANAGER and RECEPTIONIST excluded', () => {
    expect(hasPermission('OWNER', 'school.events.view')).toBe(true)
    expect(hasPermission('ADMIN', 'school.events.view')).toBe(true)
    expect(hasPermission('INSTRUCTOR', 'school.events.view')).toBe(true)
    expect(hasPermission('MANAGER', 'school.events.view')).toBe(false)
    expect(hasPermission('RECEPTIONIST', 'school.events.view')).toBe(false)
    expect(hasPermission('ASSISTANT_INSTRUCTOR', 'school.events.view')).toBe(false)
    expect(hasPermission('STUDENT', 'school.events.view')).toBe(false)
  })

  it('school.events.manage is OWNER/ADMIN only — MANAGER and INSTRUCTOR excluded', () => {
    expect(hasPermission('OWNER', 'school.events.manage')).toBe(true)
    expect(hasPermission('ADMIN', 'school.events.manage')).toBe(true)
    expect(hasPermission('MANAGER', 'school.events.manage')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.events.manage')).toBe(false)
  })

  it('school.communications.manage (broadcast messages) is OWNER/ADMIN only', () => {
    expect(hasPermission('OWNER', 'school.communications.manage')).toBe(true)
    expect(hasPermission('ADMIN', 'school.communications.manage')).toBe(true)
    expect(hasPermission('MANAGER', 'school.communications.manage')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.communications.manage')).toBe(false)
    expect(hasPermission('RECEPTIONIST', 'school.communications.manage')).toBe(false)
  })

  it('school.notifications.view is OWNER/ADMIN/MANAGER only — RECEPTIONIST excluded', () => {
    expect(hasPermission('OWNER', 'school.notifications.view')).toBe(true)
    expect(hasPermission('ADMIN', 'school.notifications.view')).toBe(true)
    expect(hasPermission('MANAGER', 'school.notifications.view')).toBe(true)
    expect(hasPermission('RECEPTIONIST', 'school.notifications.view')).toBe(false)
    expect(hasPermission('INSTRUCTOR', 'school.notifications.view')).toBe(false)
    expect(hasPermission('ASSISTANT_INSTRUCTOR', 'school.notifications.view')).toBe(false)
    expect(hasPermission('STUDENT', 'school.notifications.view')).toBe(false)
  })
})
