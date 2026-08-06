import { describe, expect, it } from 'vitest'
import {
  deriveActiveV1Ids,
  buildEmailFallbackMap,
  matchV1Id,
  resolveMember,
} from '../../../scripts/lib/rga-active-status.mjs'

// Minimal V1 users(9).csv-shaped rows for selection tests.
const v1Users = [
  { id: '1', email: 'active.student@example.com', user_type: '3', member_status: 'active', parent_id: '' },
  { id: '2', email: 'lead.student@example.com', user_type: '3', member_status: 'lead', parent_id: '' },
  { id: '798', email: 'owner@example.com', user_type: '2', member_status: 'active', parent_id: '' }, // school's own V1 account
  { id: '8365', email: 'child1@example.com', user_type: '3', member_status: 'active', parent_id: '4571' }, // family sub-account
  { id: '9', email: 'inactive.student@example.com', user_type: '3', member_status: 'inactive', parent_id: '' },
  { id: '10', email: 'dupe@example.com', user_type: '3', member_status: 'active', parent_id: '' },
  { id: '11', email: 'dupe@example.com', user_type: '3', member_status: 'lead', parent_id: '' }, // shares email with id 10
]

describe('deriveActiveV1Ids — selección', () => {
  it('includes active students, including family sub-accounts with parent_id set', () => {
    const ids = deriveActiveV1Ids(v1Users)
    expect(ids.has('1')).toBe(true)
    expect(ids.has('8365')).toBe(true) // family sub-account stays active per the confirmed decision
  })

  it('excludes non-student user_type even when member_status=active', () => {
    const ids = deriveActiveV1Ids(v1Users)
    expect(ids.has('798')).toBe(false) // school's own V1 business account, not a student
  })

  it('excludes anyone whose member_status is not active', () => {
    const ids = deriveActiveV1Ids(v1Users)
    expect(ids.has('2')).toBe(false)
    expect(ids.has('9')).toBe(false)
  })
})

describe('buildEmailFallbackMap — alcance del respaldo por email', () => {
  it('maps a unique email to its V1 id', () => {
    const map = buildEmailFallbackMap(v1Users)
    expect(map.get('active.student@example.com')).toBe('1')
  })

  it('drops emails shared by more than one V1 id entirely (no guessing)', () => {
    const map = buildEmailFallbackMap(v1Users)
    expect(map.has('dupe@example.com')).toBe(false)
  })

  it('is case-insensitive', () => {
    const map = buildEmailFallbackMap([{ id: '1', email: 'Mixed.Case@Example.com' }])
    expect(map.get('mixed.case@example.com')).toBe('1')
  })
})

describe('matchV1Id — preferencia notes sobre email', () => {
  const emailByUserId = new Map([['u1', 'active.student@example.com']])
  const v1IdByEmail = buildEmailFallbackMap(v1Users)

  it('prefers the notes marker when present', () => {
    const member = { userId: 'u1', notes: 'v1_student:999' }
    expect(matchV1Id(member, emailByUserId, v1IdByEmail)).toEqual({ v1Id: '999', matchMethod: 'notes' })
  })

  it('falls back to email when notes has no marker', () => {
    const member = { userId: 'u1', notes: null }
    expect(matchV1Id(member, emailByUserId, v1IdByEmail)).toEqual({ v1Id: '1', matchMethod: 'email' })
  })

  it('matches neither when notes is unrelated text and email is unknown', () => {
    const member = { userId: 'u-unknown', notes: 'Self-requested via "Join this school"' }
    expect(matchV1Id(member, emailByUserId, v1IdByEmail)).toEqual({ v1Id: null, matchMethod: null })
  })
})

describe('resolveMember — alcance e idempotencia', () => {
  const ctx = {
    emailByUserId: new Map([
      ['u-active', 'active.student@example.com'],
      ['u-child', 'child1@example.com'],
      ['u-owner-email-match', 'active.student@example.com'],
    ]),
    v1IdByEmail: buildEmailFallbackMap(v1Users),
    v1UserById: new Map(v1Users.map(u => [u.id, u])),
    activeV1Ids: deriveActiveV1Ids(v1Users),
  }

  it('skips any SchoolMember whose role is not STUDENT — never touches staff/native accounts', () => {
    const result = resolveMember({ userId: 'u-owner-email-match', role: 'OWNER', status: 'ACTIVE', notes: null }, ctx)
    expect(result.skipReason).toBe('non-student-role')
    expect(result.target).toBeNull()
  })

  it('skips a member with no notes marker and an email absent from the V1 export', () => {
    const result = resolveMember({ userId: 'u-nowhere', role: 'STUDENT', status: 'ACTIVE', notes: null }, ctx)
    expect(result.skipReason).toBe('unmatched')
  })

  it('skips a notes marker that cites a V1 id not present in the current export', () => {
    const result = resolveMember({ userId: 'u-active', role: 'STUDENT', status: 'ACTIVE', notes: 'v1_student:404404' }, ctx)
    expect(result.skipReason).toBe('v1-id-missing-from-export')
  })

  it('targets ACTIVE for a V1-active student matched by notes', () => {
    const result = resolveMember({ userId: 'u-active', role: 'STUDENT', status: 'INACTIVE', notes: 'v1_student:1' }, ctx)
    expect(result).toMatchObject({ skipReason: null, v1Id: '1', matchMethod: 'notes', target: 'ACTIVE' })
  })

  it('targets ACTIVE for a family sub-account matched by email fallback', () => {
    const result = resolveMember({ userId: 'u-child', role: 'STUDENT', status: 'ACTIVE', notes: null }, ctx)
    expect(result).toMatchObject({ skipReason: null, v1Id: '8365', matchMethod: 'email', target: 'ACTIVE' })
  })

  it('targets ARCHIVED for a V1-imported student not on the active list', () => {
    const result = resolveMember({ userId: 'u1', role: 'STUDENT', status: 'ACTIVE', notes: 'v1_student:9' }, ctx)
    expect(result.target).toBe('ARCHIVED')
  })

  it('idempotency: is deterministic across repeated calls with unchanged input', () => {
    const member = { userId: 'u-active', role: 'STUDENT', status: 'ACTIVE', notes: 'v1_student:1' }
    const first = resolveMember(member, ctx)
    const second = resolveMember(member, ctx)
    expect(second).toEqual(first)
  })

  it('idempotency: a member already at its target status needs no update (second-run no-op)', () => {
    const member = { userId: 'u-active', role: 'STUDENT', status: 'ACTIVE', notes: 'v1_student:1' }
    const result = resolveMember(member, ctx)
    // This is exactly the comparison the live script makes before queuing an
    // update — asserting it here locks in that a stable member never gets
    // re-queued on a second run.
    expect(result.target).toBe(member.status)
  })
})
