/**
 * Lote 0 — strict per-plan payment method validation.
 *
 * A plan's `paymentMethods` is the only source of truth for how it may be
 * paid. Before this change:
 *   - POST /api/my/checkout accepted `provider: 'REVOLUT'` for a plan that
 *     didn't list REVOLUT, and defaulted `provider` to STRIPE.
 *   - POST /api/my/memberships/[id] silently fell back to CASH when the plan
 *     allowed no manual method, or swapped an invalid explicit method for
 *     another one.
 * Now an explicit method the plan doesn't allow is rejected (never swapped),
 * a plan with no usable method is rejected, and the check runs before any
 * write or provider call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { resolveOnlineMethod, resolveManualMethod } from '@/lib/paymentMethods'

// ── Pure resolvers ──────────────────────────────────────────────────────────

describe('resolveOnlineMethod', () => {
  it('no preference → STRIPE first, then REVOLUT, among allowed methods', () => {
    expect(resolveOnlineMethod(undefined, ['CASH', 'REVOLUT', 'STRIPE'])).toEqual({ ok: true, method: 'STRIPE' })
    expect(resolveOnlineMethod(undefined, ['CASH', 'REVOLUT'])).toEqual({ ok: true, method: 'REVOLUT' })
    expect(resolveOnlineMethod(null, ['STRIPE'])).toEqual({ ok: true, method: 'STRIPE' })
  })

  it('no preference and no online method → rejected', () => {
    expect(resolveOnlineMethod(undefined, ['CASH']).ok).toBe(false)
    expect(resolveOnlineMethod(undefined, []).ok).toBe(false)
  })

  it('explicit provider not allowed by the plan → rejected, not swapped', () => {
    expect(resolveOnlineMethod('REVOLUT', ['STRIPE', 'CASH']).ok).toBe(false)
    expect(resolveOnlineMethod('STRIPE', ['REVOLUT']).ok).toBe(false)
  })

  it('explicit non-online or unknown value → rejected', () => {
    expect(resolveOnlineMethod('CASH', ['CASH', 'STRIPE']).ok).toBe(false)
    expect(resolveOnlineMethod('PAYPAL', ['PAYPAL']).ok).toBe(false)
    expect(resolveOnlineMethod(42, ['STRIPE']).ok).toBe(false)
  })

  it('explicit allowed provider → accepted', () => {
    expect(resolveOnlineMethod('REVOLUT', ['STRIPE', 'REVOLUT'])).toEqual({ ok: true, method: 'REVOLUT' })
  })
})

describe('resolveManualMethod', () => {
  it('no preference → first allowed manual method in catalog order', () => {
    expect(resolveManualMethod(undefined, ['STRIPE', 'BANK_TRANSFER', 'CASH'])).toEqual({ ok: true, method: 'CASH' })
    expect(resolveManualMethod(undefined, ['STRIPE', 'BANK_TRANSFER'])).toEqual({ ok: true, method: 'BANK_TRANSFER' })
  })

  it('no manual method on the plan → rejected (no CASH fallback)', () => {
    expect(resolveManualMethod(undefined, []).ok).toBe(false)
    expect(resolveManualMethod(undefined, ['STRIPE']).ok).toBe(false)
  })

  it('explicit method not allowed → rejected, not swapped', () => {
    expect(resolveManualMethod('BANK_TRANSFER', ['CASH']).ok).toBe(false)
    expect(resolveManualMethod('STRIPE', ['STRIPE', 'CASH']).ok).toBe(false)
  })

  it('explicit allowed method → accepted', () => {
    expect(resolveManualMethod('BANK_TRANSFER', ['CASH', 'BANK_TRANSFER'])).toEqual({ ok: true, method: 'BANK_TRANSFER' })
  })
})

// ── Route wiring ────────────────────────────────────────────────────────────

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: () => mockGetAuthUser() }))

const mockPlanFindUnique = vi.fn()
const mockSchoolFindUnique = vi.fn()
const mockSchoolMemberFindFirst = vi.fn()
const mockMembershipFindFirst = vi.fn()
const mockMembershipCreate = vi.fn()
const mockMembershipDelete = vi.fn()
const mockMembershipUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    membershipPlan: { findUnique: (...a: unknown[]) => mockPlanFindUnique(...a) },
    school: { findUnique: (...a: unknown[]) => mockSchoolFindUnique(...a) },
    schoolMember: { findFirst: (...a: unknown[]) => mockSchoolMemberFindFirst(...a), findMany: vi.fn().mockResolvedValue([]) },
    membership: {
      findFirst: (...a: unknown[]) => mockMembershipFindFirst(...a),
      findMany: async () => [], // findPausedMembership: no PAUSED rows
      create: (...a: unknown[]) => mockMembershipCreate(...a),
      delete: (...a: unknown[]) => mockMembershipDelete(...a),
      update: (...a: unknown[]) => mockMembershipUpdate(...a),
    },
  },
}))

const mockStripeSessionCreate = vi.fn().mockResolvedValue({ url: 'https://stripe.test/session' })
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...a: unknown[]) => mockStripeSessionCreate(...a) } } }),
}))
const mockCreateRevolutOrder = vi.fn().mockResolvedValue({ id: 'ord_1', checkout_url: 'https://revolut.test/order' })
vi.mock('@/lib/revolut', () => ({ createRevolutOrder: (...a: unknown[]) => mockCreateRevolutOrder(...a) }))

vi.mock('@/lib/services/membership', () => ({ cancelMembership: vi.fn(), syncSchoolMemberStatusForMembership: vi.fn() }))
vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipRequestEmail: vi.fn() }))
vi.mock('@/lib/notifications/create', () => ({ notifyMembershipRequest: vi.fn() }))

function basePlan(paymentMethods: string[]) {
  return {
    id: 'plan_1', schoolId: 'school_1', name: 'Pase 1 Semana', price: 50, currency: 'EUR',
    planType: 'SINGLE_PASS', billingCycle: 'one-off', validityDays: 7,
    isPublic: true, isActive: true, paymentMethods, stripePriceId: null,
  }
}

function post(url: string, body: unknown) {
  return new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'user_1', email: 'student@test.local', name: 'Student' })
  mockSchoolMemberFindFirst.mockResolvedValue(null)
  mockMembershipFindFirst.mockResolvedValue(null)
  mockSchoolFindUnique.mockResolvedValue({
    stripeSecretKey: 'sk_test_x', revolutSecretKey: 'rk_x', revolutWebhookSecret: 'wh_x', name: 'Test School',
  })
})

describe('POST /api/my/checkout — method validation', () => {
  it('rejects REVOLUT for a plan that only allows STRIPE, before any write or provider call', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['STRIPE', 'CASH']))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post('http://localhost/api/my/checkout', { planId: 'plan_1', provider: 'REVOLUT' }))
    expect(res.status).toBe(400)
    expect(mockMembershipCreate).not.toHaveBeenCalled()
    expect(mockMembershipDelete).not.toHaveBeenCalled()
    expect(mockCreateRevolutOrder).not.toHaveBeenCalled()
    expect(mockStripeSessionCreate).not.toHaveBeenCalled()
  })

  it('rejects a plan with no online method', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['CASH']))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post('http://localhost/api/my/checkout', { planId: 'plan_1' }))
    expect(res.status).toBe(400)
    expect(mockStripeSessionCreate).not.toHaveBeenCalled()
  })

  it('does not delete a stale Revolut row when the school has no Revolut configured', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['REVOLUT']))
    mockSchoolFindUnique.mockResolvedValue({ stripeSecretKey: null, revolutSecretKey: null, revolutWebhookSecret: null, name: 'S' })
    mockMembershipFindFirst.mockResolvedValue({ id: 'm_old', status: 'PENDING', paymentMethod: 'REVOLUT' })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post('http://localhost/api/my/checkout', { planId: 'plan_1', provider: 'REVOLUT' }))
    expect(res.status).toBe(400)
    expect(mockMembershipDelete).not.toHaveBeenCalled()
  })

  it('allowed STRIPE still creates a checkout session', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['STRIPE', 'CASH']))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post('http://localhost/api/my/checkout', { planId: 'plan_1', provider: 'STRIPE' }))
    expect(res.status).toBe(200)
    expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/my/memberships/[id] — manual method validation', () => {
  const params = { params: Promise.resolve({ id: 'plan_1' }) }

  it('rejects a plan with no manual method instead of defaulting to CASH', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan([]))
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm_1' })
    const { POST } = await import('@/app/api/my/memberships/[id]/route')
    const res = await POST(post('http://localhost/api/my/memberships/plan_1', {}), params)
    expect(res.status).toBe(400)
    expect(mockMembershipCreate).not.toHaveBeenCalled()
  })

  it('rejects an explicit method the plan does not allow (no silent swap)', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['CASH']))
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm_1' })
    const { POST } = await import('@/app/api/my/memberships/[id]/route')
    const res = await POST(post('http://localhost/api/my/memberships/plan_1', { paymentMethod: 'BANK_TRANSFER' }), params)
    expect(res.status).toBe(400)
    expect(mockMembershipCreate).not.toHaveBeenCalled()
  })

  it('allowed CASH still creates a PENDING request with that method', async () => {
    mockPlanFindUnique.mockResolvedValue(basePlan(['STRIPE', 'CASH']))
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm_1' })
    mockMembershipCreate.mockResolvedValue({ id: 'm_new', status: 'PENDING', paymentMethod: 'CASH' })
    const { POST } = await import('@/app/api/my/memberships/[id]/route')
    const res = await POST(post('http://localhost/api/my/memberships/plan_1', { paymentMethod: 'CASH' }), params)
    expect(res.status).toBe(201)
    expect(mockMembershipCreate.mock.calls[0]?.[0]?.data?.paymentMethod).toBe('CASH')
  })
})
