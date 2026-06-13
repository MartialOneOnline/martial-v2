/**
 * Tests for free trial eligibility rules (Priority 3).
 * Tests pure guard logic without DB calls.
 */
import { describe, it, expect } from 'vitest'

type School = {
  id: string
  hasFreeTrialCls: boolean
  status: string
}

type PreviousMembership = { id: string } | null

function checkTrialEligibility(
  school: School | null,
  previousMembership: PreviousMembership,
): { ok: boolean; status: number; error?: string } {
  if (!school) return { ok: false, status: 404, error: 'School not found' }
  if (school.status === 'SUSPENDED') return { ok: false, status: 403, error: 'School is not available' }
  if (!school.hasFreeTrialCls) return { ok: false, status: 403, error: 'This school does not offer free trials' }
  if (previousMembership) return { ok: false, status: 409, error: 'You have already used a trial at this school' }
  return { ok: true, status: 200 }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkTrialEligibility()', () => {
  const eligibleSchool: School = { id: 's1', hasFreeTrialCls: true, status: 'VERIFIED' }

  it('rejects when school not found', () => {
    const r = checkTrialEligibility(null, null)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(404)
  })

  it('rejects when school is SUSPENDED', () => {
    const r = checkTrialEligibility({ ...eligibleSchool, status: 'SUSPENDED' }, null)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(403)
  })

  it('rejects when school does not offer free trials', () => {
    const r = checkTrialEligibility({ ...eligibleSchool, hasFreeTrialCls: false }, null)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(403)
    expect(r.error).toContain('does not offer free trials')
  })

  it('rejects repeat trial even with cancelled/expired previous membership', () => {
    const r = checkTrialEligibility(eligibleSchool, { id: 'existing-membership' })
    expect(r.ok).toBe(false)
    expect(r.status).toBe(409)
    expect(r.error).toContain('already used a trial')
  })

  it('allows trial when school is eligible and no previous membership', () => {
    const r = checkTrialEligibility(eligibleSchool, null)
    expect(r.ok).toBe(true)
  })
})
