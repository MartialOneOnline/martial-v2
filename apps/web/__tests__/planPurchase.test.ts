/**
 * Lote 1a — buying a plan from the public school profile / class modal.
 *
 * Buying and booking are separate steps. These tests pin down:
 *   - computeAccessEndDate keeps each provider's historic behaviour;
 *   - evaluatePlanForPurchase (online / manual / unavailable, Revolut never
 *     sells a subscription, class coverage, no invented coverage);
 *   - findNextSession uses the booking calendar rules (UTC, cancellations, window);
 *   - POST /api/my/checkout re-validates before any write or provider call;
 *   - GET /api/my/checkout/status reports one attempt only, read-only;
 *   - PAUSED membership handling (sync guard + in-transaction notice).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { computeAccessEndDate } from '@/lib/services/accessEndDate'
import {
  evaluatePlanForPurchase, findNextSession, planIncludesClass, isOfferableForClass,
  type PlanForEligibility,
} from '@/lib/services/planEligibility'
import { checkClassAccess } from '@/lib/services/classAccess'

const DAY = 86_400_000
const NOW = new Date('2026-11-27T10:00:00.000Z') // Friday

// ── computeAccessEndDate (characterisation of the two webhooks) ─────────────

describe('computeAccessEndDate', () => {
  it('Stripe: one-off plan with validityDays → now + days (metadata string)', () => {
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: 'SINGLE_PASS', validityDays: '7', now: NOW })?.toISOString())
      .toBe(new Date(NOW.getTime() + 7 * DAY).toISOString())
  })
  it('Stripe: SUBSCRIPTION never gets an end date, even with validityDays', () => {
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: 'SUBSCRIPTION', validityDays: '30', now: NOW })).toBeNull()
  })
  it("Stripe: empty metadata ('') or missing → no end date", () => {
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: 'SINGLE_PASS', validityDays: '', now: NOW })).toBeNull()
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: 'SINGLE_PASS', validityDays: undefined, now: NOW })).toBeNull()
  })
  it("Stripe: '0' is a truthy string → end date = now (original inline behaviour kept)", () => {
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: 'SINGLE_PASS', validityDays: '0', now: NOW })?.getTime()).toBe(NOW.getTime())
  })
  it('Stripe: missing planType is not treated as SUBSCRIPTION', () => {
    expect(computeAccessEndDate({ provider: 'STRIPE', planType: '', validityDays: '1', now: NOW })?.getTime()).toBe(NOW.getTime() + DAY)
  })
  it('Revolut: any plan with validityDays gets an end date, SUBSCRIPTION included (historic orders)', () => {
    expect(computeAccessEndDate({ provider: 'REVOLUT', planType: 'SUBSCRIPTION', validityDays: 30, now: NOW })?.getTime()).toBe(NOW.getTime() + 30 * DAY)
    expect(computeAccessEndDate({ provider: 'REVOLUT', planType: 'SINGLE_PASS', validityDays: 1, now: NOW })?.getTime()).toBe(NOW.getTime() + DAY)
  })
  it('Revolut: null / 0 validityDays → no end date', () => {
    expect(computeAccessEndDate({ provider: 'REVOLUT', planType: 'SINGLE_PASS', validityDays: null, now: NOW })).toBeNull()
    expect(computeAccessEndDate({ provider: 'REVOLUT', planType: 'SINGLE_PASS', validityDays: 0, now: NOW })).toBeNull()
  })
})

// ── evaluatePlanForPurchase ─────────────────────────────────────────────────

function plan(over: Partial<PlanForEligibility> = {}): PlanForEligibility {
  return {
    price: 30, planType: 'SINGLE_PASS', billingCycle: 'one-off', validityDays: 7,
    paymentMethods: ['STRIPE'], classAccess: {}, ...over,
  }
}
const BOTH = { stripe: true, revolut: true }

describe('evaluatePlanForPurchase — purchase mode and offers', () => {
  it('online when an allowed provider is connected', () => {
    const e = evaluatePlanForPurchase(plan({ paymentMethods: ['STRIPE', 'REVOLUT'] }), BOTH, NOW)
    expect(e.purchase).toBe('online')
    expect(e.offers).toEqual([{ provider: 'STRIPE', renews: false }, { provider: 'REVOLUT', renews: false }])
  })
  it('allowed but not connected is NOT manual — it is unavailable', () => {
    const e = evaluatePlanForPurchase(plan({ paymentMethods: ['STRIPE'] }), { stripe: false, revolut: false }, NOW)
    expect(e.purchase).toBe('unavailable')
    expect(e.offers).toEqual([])
  })
  it('Revolut needs key AND webhook secret (provider config false → no offer)', () => {
    const e = evaluatePlanForPurchase(plan({ paymentMethods: ['REVOLUT'] }), { stripe: true, revolut: false }, NOW)
    expect(e.purchase).toBe('unavailable')
  })
  it('manual only when the plan allows a manual method and no online offer exists', () => {
    expect(evaluatePlanForPurchase(plan({ paymentMethods: ['CASH'] }), BOTH, NOW).purchase).toBe('manual')
    expect(evaluatePlanForPurchase(plan({ paymentMethods: ['STRIPE', 'BANK_TRANSFER'] }), { stripe: false, revolut: false }, NOW).purchase).toBe('manual')
  })
  it('plan without methods → unavailable (not "pay at the school")', () => {
    expect(evaluatePlanForPurchase(plan({ paymentMethods: [] }), BOTH, NOW).purchase).toBe('unavailable')
  })
  it('SUBSCRIPTION is only offered through Stripe, flagged as renewing', () => {
    const e = evaluatePlanForPurchase(plan({ planType: 'SUBSCRIPTION', billingCycle: 'monthly', paymentMethods: ['STRIPE', 'REVOLUT'] }), BOTH, NOW)
    expect(e.offers).toEqual([{ provider: 'STRIPE', renews: true }])
    expect(e.validity).toEqual({ kind: 'renews', billingCycle: 'monthly' })
  })
  it('SUBSCRIPTION allowed only via Revolut → nothing online to offer', () => {
    const e = evaluatePlanForPurchase(plan({ planType: 'SUBSCRIPTION', paymentMethods: ['REVOLUT'] }), BOTH, NOW)
    expect(e.purchase).toBe('unavailable')
  })
  it('free plans are never sold through checkout', () => {
    expect(evaluatePlanForPurchase(plan({ price: 0 }), BOTH, NOW).purchase).toBe('unavailable')
  })
  it('validityDays null on a one-off plan = no expiry (existing semantics)', () => {
    expect(evaluatePlanForPurchase(plan({ validityDays: null }), BOTH, NOW).validity).toEqual({ kind: 'no_expiry' })
  })
})

describe('evaluatePlanForPurchase — class check', () => {
  const nextMon = new Date('2026-11-30T19:00:00.000Z')

  it('class excluded by an explicit rule → not_included', () => {
    const p = plan({ classAccess: { classRules: [{ classId: 'c1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] } })
    const e = evaluatePlanForPurchase(p, BOTH, NOW, { classId: 'c1', nextSession: nextMon })
    expect(e.classCheck).toEqual({ status: 'not_included' })
    expect(isOfferableForClass(e)).toBe(false)
  })
  it('a 1-day pass bought Friday does not cover Monday → expires_before_session', () => {
    const e = evaluatePlanForPurchase(plan({ validityDays: 1 }), BOTH, NOW, { classId: 'c1', nextSession: nextMon })
    expect(e.classCheck?.status).toBe('expires_before_session')
    expect(isOfferableForClass(e)).toBe(false)
  })
  it('a 7-day pass covers Monday', () => {
    const e = evaluatePlanForPurchase(plan({ validityDays: 7 }), BOTH, NOW, { classId: 'c1', nextSession: nextMon })
    expect(e.classCheck).toMatchObject({ status: 'covered' })
    expect(isOfferableForClass(e)).toBe(true)
  })
  it('end date exactly at the session start still covers it (booking uses endDate >= scheduledAt)', () => {
    const at = new Date(NOW.getTime() + DAY)
    const e = evaluatePlanForPurchase(plan({ validityDays: 1 }), BOTH, NOW, { classId: 'c1', nextSession: at })
    expect(e.classCheck?.status).toBe('covered')
  })
  it('no upcoming session → explicit result, no date and no coverage claim', () => {
    const e = evaluatePlanForPurchase(plan(), BOTH, NOW, { classId: 'c1', nextSession: null })
    expect(e.classCheck).toEqual({ status: 'no_upcoming_session' })
    expect(isOfferableForClass(e)).toBe(false)
  })
  it('subscription: reported as "while active", never as a guaranteed date', () => {
    const e = evaluatePlanForPurchase(plan({ planType: 'SUBSCRIPTION', billingCycle: 'monthly' }), BOTH, NOW, { classId: 'c1', nextSession: nextMon })
    expect(e.classCheck).toEqual({ status: 'subscription', nextSession: nextMon })
    expect('accessEndsAt' in (e.classCheck ?? {})).toBe(false)
  })
  it('a plan that can only be paid at the school is not offerable for a class online', () => {
    const e = evaluatePlanForPurchase(plan({ paymentMethods: ['CASH'] }), BOTH, NOW, { classId: 'c1', nextSession: nextMon })
    expect(isOfferableForClass(e)).toBe(false)
  })
})

describe('planIncludesClass — same semantics as checkClassAccess without usage limits', () => {
  const zero = { perWeek: 0, perMonth: 0, total: 0, globalPerWeek: 0, globalPerMonth: 0, globalTotal: 0 }
  const cases: [string, unknown][] = [
    ['null', null],
    ['{} (unrestricted)', {}],
    ['empty rules', { classRules: [] }],
    ['rule for another class', { classRules: [{ classId: 'other', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] }],
    ['included unlimited', { classRules: [{ classId: 'c1', included: true, unlimited: true, limit: '', limitType: 'PER_WEEK' }] }],
    ['excluded', { classRules: [{ classId: 'c1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] }],
  ]
  for (const [label, cfg] of cases) {
    it(label, () => {
      expect(planIncludesClass(cfg, 'c1')).toBe(checkClassAccess(cfg as never, 'c1', zero).allowed)
    })
  }
})

// ── findNextSession ─────────────────────────────────────────────────────────

describe('findNextSession — booking calendar rules', () => {
  const monday = [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }]

  it('next Monday 19:00 UTC', () => {
    expect(findNextSession(monday, new Set(), NOW)?.toISOString()).toBe('2026-11-30T19:00:00.000Z')
  })
  it('skips a cancelled occurrence', () => {
    expect(findNextSession(monday, new Set(['2026-11-30']), NOW)?.toISOString()).toBe('2026-12-07T19:00:00.000Z')
  })
  it('a session starting right now is not "next" (bookings reject past/now)', () => {
    const at = new Date('2026-11-30T19:00:00.000Z')
    expect(findNextSession(monday, new Set(), at)?.toISOString()).toBe('2026-12-07T19:00:00.000Z')
  })
  it('earliest across several slots', () => {
    const slots = [...monday, { dayOfWeek: 6, startTime: '10:00', endTime: '11:00' }]
    expect(findNextSession(slots, new Set(), NOW)?.toISOString()).toBe('2026-11-28T10:00:00.000Z')
  })
  it('nothing inside the window → null (never an invented date)', () => {
    const all = new Set(Array.from({ length: 10 }, (_, i) => new Date(Date.UTC(2026, 10, 30 + i * 7)).toISOString().slice(0, 10)))
    expect(findNextSession(monday, all, NOW)).toBeNull()
    expect(findNextSession([], new Set(), NOW)).toBeNull()
    expect(findNextSession(null, new Set(), NOW)).toBeNull()
  })
  it('across a DST change week the time stays the UTC slot (same as POST /api/bookings)', () => {
    const beforeDst = new Date('2027-03-26T12:00:00.000Z') // Europe switches 2027-03-28
    expect(findNextSession(monday, new Set(), beforeDst)?.toISOString()).toBe('2027-03-29T19:00:00.000Z')
  })
})

// ── Route wiring ────────────────────────────────────────────────────────────

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: () => mockGetAuthUser() }))

const m = {
  planFindUnique: vi.fn(),
  schoolFindUnique: vi.fn(),
  schoolMemberFindFirst: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  membershipDelete: vi.fn(),
  membershipUpdate: vi.fn(),
  classFindUnique: vi.fn(),
  cancellationFindMany: vi.fn(),
  transactionFindFirst: vi.fn(),
}
vi.mock('@/lib/db', () => ({
  prisma: {
    membershipPlan: { findUnique: (...a: unknown[]) => m.planFindUnique(...a) },
    school: { findUnique: (...a: unknown[]) => m.schoolFindUnique(...a) },
    schoolMember: { findFirst: (...a: unknown[]) => m.schoolMemberFindFirst(...a) },
    membership: {
      findFirst: (...a: unknown[]) => m.membershipFindFirst(...a),
      create: (...a: unknown[]) => m.membershipCreate(...a),
      delete: (...a: unknown[]) => m.membershipDelete(...a),
      update: (...a: unknown[]) => m.membershipUpdate(...a),
    },
    class: { findUnique: (...a: unknown[]) => m.classFindUnique(...a) },
    classCancellation: { findMany: (...a: unknown[]) => m.cancellationFindMany(...a) },
    transaction: { findFirst: (...a: unknown[]) => m.transactionFindFirst(...a) },
  },
}))

const mockStripeSessionCreate = vi.fn().mockResolvedValue({ url: 'https://stripe.test/session' })
const mockStripeSessionRetrieve = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: {
      create: (...a: unknown[]) => mockStripeSessionCreate(...a),
      retrieve: (...a: unknown[]) => mockStripeSessionRetrieve(...a),
    } },
  }),
}))
const mockCreateRevolutOrder = vi.fn().mockResolvedValue({ id: 'ord_1', checkout_url: 'https://revolut.test/order' })
const mockGetRevolutOrder = vi.fn()
vi.mock('@/lib/revolut', () => ({
  createRevolutOrder: (...a: unknown[]) => mockCreateRevolutOrder(...a),
  getRevolutOrder: (...a: unknown[]) => mockGetRevolutOrder(...a),
}))

const SCHOOL = { stripeSecretKey: 'sk_test_x', revolutSecretKey: 'rk_x', revolutWebhookSecret: 'wh_x', name: 'RGM' }
const CLASS_MON = {
  id: 'class_1', name: 'Jiu Jitsu Avanzado', schoolId: 'school_1', isActive: true, isPublished: true,
  schedule: [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }],
}

function dbPlan(over: Record<string, unknown> = {}) {
  return {
    id: 'plan_1', schoolId: 'school_1', name: 'Pase 1 Semana', price: 50, currency: 'EUR',
    planType: 'SINGLE_PASS', billingCycle: 'one-off', validityDays: 7,
    isPublic: true, isActive: true, paymentMethods: ['STRIPE'], stripePriceId: null, classAccess: {},
    ...over,
  }
}
function post(body: unknown) {
  return new NextRequest('http://localhost/api/my/checkout', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: 'https://app.test' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  mockGetAuthUser.mockResolvedValue({ id: 'user_1', email: 'student@test.local', name: 'Student' })
  m.schoolMemberFindFirst.mockResolvedValue(null)
  m.membershipFindFirst.mockResolvedValue(null)
  m.schoolFindUnique.mockResolvedValue(SCHOOL)
  m.classFindUnique.mockResolvedValue(CLASS_MON)
  m.cancellationFindMany.mockResolvedValue([])
  m.planFindUnique.mockResolvedValue(dbPlan())
})

function expectNoWrites() {
  expect(m.membershipCreate).not.toHaveBeenCalled()
  expect(m.membershipDelete).not.toHaveBeenCalled()
  expect(mockStripeSessionCreate).not.toHaveBeenCalled()
  expect(mockCreateRevolutOrder).not.toHaveBeenCalled()
}

describe('POST /api/my/checkout — re-validation before any write', () => {
  it('REVOLUT for a SUBSCRIPTION is rejected (it would never renew)', async () => {
    m.planFindUnique.mockResolvedValue(dbPlan({ planType: 'SUBSCRIPTION', billingCycle: 'monthly', paymentMethods: ['STRIPE', 'REVOLUT'] }))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'REVOLUT' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('method_not_offered')
    expectNoWrites()
  })

  it('classId from another school → 400 class_unavailable', async () => {
    m.classFindUnique.mockResolvedValue({ ...CLASS_MON, schoolId: 'school_other' })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('class_unavailable')
    expectNoWrites()
  })

  it('unpublished class → 400 class_unavailable', async () => {
    m.classFindUnique.mockResolvedValue({ ...CLASS_MON, isPublished: false })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect(res.status).toBe(400)
    expectNoWrites()
  })

  it('class excluded by the plan → 400 class_not_included', async () => {
    m.planFindUnique.mockResolvedValue(dbPlan({ classAccess: { classRules: [{ classId: 'class_1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] } }))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect((await res.json()).code).toBe('class_not_included')
    expectNoWrites()
  })

  it('pass that would expire before the next session → 400', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW) // Friday; next Monday session is > 1 day away
    m.planFindUnique.mockResolvedValue(dbPlan({ validityDays: 1, name: 'Pase 1 Día' }))
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect((await res.json()).code).toBe('expires_before_session')
    expectNoWrites()
  })

  it('class with no upcoming session → 400, never assumed covered', async () => {
    m.classFindUnique.mockResolvedValue({ ...CLASS_MON, schedule: [] })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect((await res.json()).code).toBe('no_upcoming_session')
    expectNoWrites()
  })

  it('ARCHIVED member → 403 without calling Stripe', async () => {
    m.schoolMemberFindFirst.mockResolvedValue({ id: 'sm_1' })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE' }))
    expect(res.status).toBe(403)
    expectNoWrites()
  })

  it('a paused membership must be acknowledged first (re-checked server-side)', async () => {
    m.membershipFindFirst.mockImplementation(async (args: { where: { status?: unknown } }) =>
      args.where.status === 'PAUSED' ? { planName: 'Jiu Jitsu Mensual', stripeSubId: 'sub_1' } : null)
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('paused_membership_ack_required')
    expect(body.pausedMembership).toEqual({ planName: 'Jiu Jitsu Mensual', recurring: true }) // no subscription id leaked
    expectNoWrites()

    const ok = await POST(post({ planId: 'plan_1', provider: 'STRIPE', acknowledgePausedMembership: true }))
    expect(ok.status).toBe(200)
    expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
  })

  it('FROZEN / INACTIVE members may buy (only ARCHIVED is blocked)', async () => {
    // The ARCHIVED lookup filters by status ARCHIVED; FROZEN/INACTIVE rows don't match it.
    m.schoolMemberFindFirst.mockImplementation(async (args: { where: { status?: string } }) =>
      args.where.status === 'ARCHIVED' ? null : { id: 'sm_1', status: 'FROZEN' })
    const { POST } = await import('@/app/api/my/checkout/route')
    const res = await POST(post({ planId: 'plan_1', provider: 'STRIPE', classId: 'class_1' }))
    expect(res.status).toBe(200)
    expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
  })

  it('Stripe success/cancel URLs point at /checkout/return with the session placeholder', async () => {
    const { POST } = await import('@/app/api/my/checkout/route')
    await POST(post({ planId: 'plan_1', provider: 'STRIPE' }))
    const args = mockStripeSessionCreate.mock.calls[0]?.[0] as { success_url: string; cancel_url: string }
    expect(args.success_url).toBe('https://app.test/checkout/return?provider=stripe&plan=plan_1&session_id={CHECKOUT_SESSION_ID}')
    expect(args.cancel_url).toBe('https://app.test/checkout/return?provider=stripe&plan=plan_1&cancelled=1')
  })
})

// ── GET /api/my/checkout/status ─────────────────────────────────────────────

function statusReq(qs: string) {
  return new NextRequest(`http://localhost/api/my/checkout/status?${qs}`)
}
const STRIPE_QS = 'provider=stripe&session_id=cs_test_1&plan=plan_1'
const PLAN_WITH_SCHOOL = { id: 'plan_1', schoolId: 'school_1', name: 'Pase 1 Semana', school: { id: 'school_1', name: 'RGM', slug: 'rgm', stripeSecretKey: 'sk_test_x' } }
const META = { userId: 'user_1', planId: 'plan_1', schoolId: 'school_1' }

describe('GET /api/my/checkout/status — one attempt, read-only', () => {
  beforeEach(async () => {
    const { __resetRateLimitsForTests } = await import('@/lib/rateLimit')
    __resetRateLimitsForTests()
    m.planFindUnique.mockResolvedValue(PLAN_WITH_SCHOOL)
    m.transactionFindFirst.mockResolvedValue(null)
  })

  it("someone else's session → 404 (indistinguishable from not found)", async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_1', metadata: { ...META, userId: 'user_2' } })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect((await GET(statusReq(STRIPE_QS))).status).toBe(404)
    expect(m.transactionFindFirst).not.toHaveBeenCalled()
  })

  it('plan hint that does not match the session → 404', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', metadata: { ...META, planId: 'plan_other' } })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect((await GET(statusReq(STRIPE_QS))).status).toBe(404)
  })

  it('forged success return with an unpaid session → unconfirmed, no access', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'unpaid', status: 'open', metadata: META })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    const body = await (await GET(statusReq(STRIPE_QS))).json()
    expect(body).toMatchObject({ payment: 'unconfirmed', access: 'none', incident: null })
  })

  it('expired unpaid session → not_completed', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'unpaid', status: 'expired', metadata: META })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect((await (await GET(statusReq(STRIPE_QS))).json()).payment).toBe('not_completed')
  })

  it('paid but webhook not processed yet → pending_activation (an older membership of the same plan does not count)', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_new', metadata: META })
    m.membershipFindFirst.mockResolvedValue({ status: 'ACTIVE' }) // must NOT be consulted for one-off payments
    const { GET } = await import('@/app/api/my/checkout/status/route')
    const body = await (await GET(statusReq(STRIPE_QS))).json()
    expect(body).toMatchObject({ payment: 'paid', access: 'pending_activation' })
    expect(m.transactionFindFirst.mock.calls[0]?.[0]).toMatchObject({ where: { stripePaymentIntentId: 'pi_new', userId: 'user_1', schoolId: 'school_1' } })
  })

  it('activated by the webhook → active, with the purchased school', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', status: 'complete', payment_intent: 'pi_1', metadata: META })
    m.transactionFindFirst.mockResolvedValue({ status: 'COMPLETED', membership: { status: 'ACTIVE' } })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    const body = await (await GET(statusReq(STRIPE_QS))).json()
    expect(body).toMatchObject({ payment: 'paid', access: 'active', school: { id: 'school_1', slug: 'rgm' } })
  })

  it('paid then paused / cancelled → reported as such, not "activating"', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', payment_intent: 'pi_1', metadata: META })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    m.transactionFindFirst.mockResolvedValue({ status: 'COMPLETED', membership: { status: 'PAUSED' } })
    expect((await (await GET(statusReq(STRIPE_QS))).json()).access).toBe('paused')
    m.transactionFindFirst.mockResolvedValue({ status: 'COMPLETED', membership: { status: 'CANCELLED' } })
    expect((await (await GET(statusReq(STRIPE_QS))).json()).access).toBe('ended')
  })

  it('captured for an archived member (FLAGGED) → incident needs_school', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', payment_intent: 'pi_1', metadata: META })
    m.transactionFindFirst.mockResolvedValue({ status: 'FLAGGED', membership: null })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect(await (await GET(statusReq(STRIPE_QS))).json()).toMatchObject({ payment: 'paid', access: 'none', incident: 'needs_school' })
  })

  it('subscription checkout links through stripeSubId', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'paid', subscription: 'sub_1', metadata: META })
    m.membershipFindFirst.mockResolvedValue({ status: 'ACTIVE' })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect((await (await GET(statusReq(STRIPE_QS))).json()).access).toBe('active')
    expect(m.membershipFindFirst.mock.calls[0]?.[0]).toMatchObject({ where: { stripeSubId: 'sub_1', userId: 'user_1' } })
  })

  it('provider error → payment unknown (never "not paid")', async () => {
    mockStripeSessionRetrieve.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }))
    const { GET } = await import('@/app/api/my/checkout/status/route')
    const res = await GET(statusReq(STRIPE_QS))
    expect(res.status).toBe(200)
    expect((await res.json()).payment).toBe('unknown')
  })

  it('rate limited per user', async () => {
    mockStripeSessionRetrieve.mockResolvedValue({ payment_status: 'unpaid', metadata: META })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    let last = 200
    for (let i = 0; i < 46; i++) last = (await GET(statusReq(STRIPE_QS))).status
    expect(last).toBe(429)
  })

  it('Revolut: attempt of another user → 404', async () => {
    m.membershipFindFirst.mockResolvedValue(null)
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect((await GET(statusReq('provider=revolut&attempt=m_1'))).status).toBe(404)
    expect(m.membershipFindFirst.mock.calls[0]?.[0]).toMatchObject({ where: { id: 'm_1', userId: 'user_1' } })
  })

  it('Revolut: completed order not yet activated → paid + pending_activation; failed → not_completed', async () => {
    m.membershipFindFirst.mockResolvedValue({ status: 'PENDING', planName: 'Pase', revolutOrderId: 'ord_1', school: { id: 'school_1', name: 'RGM', slug: 'rgm', revolutSecretKey: 'rk' } })
    const { GET } = await import('@/app/api/my/checkout/status/route')
    mockGetRevolutOrder.mockResolvedValue({ state: 'COMPLETED' })
    expect(await (await GET(statusReq('provider=revolut&attempt=m_1'))).json()).toMatchObject({ payment: 'paid', access: 'pending_activation' })
    mockGetRevolutOrder.mockResolvedValue({ state: 'FAILED' })
    expect(await (await GET(statusReq('provider=revolut&attempt=m_1'))).json()).toMatchObject({ payment: 'not_completed', access: 'none' })
  })

  it('Revolut: our own ACTIVE record proves the payment even if the provider lookup fails', async () => {
    m.membershipFindFirst.mockResolvedValue({ status: 'ACTIVE', planName: 'Pase', revolutOrderId: 'ord_1', school: { id: 'school_1', name: 'RGM', slug: 'rgm', revolutSecretKey: 'rk' } })
    mockGetRevolutOrder.mockRejectedValue(new Error('down'))
    const { GET } = await import('@/app/api/my/checkout/status/route')
    expect(await (await GET(statusReq('provider=revolut&attempt=m_1'))).json()).toMatchObject({ payment: 'paid', access: 'active' })
  })
})

// ── PAUSED membership handling ──────────────────────────────────────────────

describe('syncSchoolMemberStatusForMembership — PAUSED with another ACTIVE plan', () => {
  it('pausing an old membership does not freeze a student who has another ACTIVE one', async () => {
    const { syncSchoolMemberStatusForMembership } = await import('@/lib/services/membership')
    const updateMany = vi.fn()
    const tx = { membership: { findFirst: vi.fn().mockResolvedValue({ id: 'm_new' }) }, schoolMember: { updateMany } }
    await syncSchoolMemberStatusForMembership(tx as never, { userId: 'u', schoolId: 's', membershipStatus: 'PAUSED' as never, excludeMembershipId: 'm_old' })
    expect(updateMany).not.toHaveBeenCalled()
  })
  it('still freezes when there is no other ACTIVE membership', async () => {
    const { syncSchoolMemberStatusForMembership } = await import('@/lib/services/membership')
    const updateMany = vi.fn()
    const tx = { membership: { findFirst: vi.fn().mockResolvedValue(null) }, schoolMember: { updateMany } }
    await syncSchoolMemberStatusForMembership(tx as never, { userId: 'u', schoolId: 's', membershipStatus: 'PAUSED' as never, excludeMembershipId: 'm_old' })
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'FROZEN' } }))
  })
})

describe('notifyPurchaseWithPausedMembership — written with the activation transaction', () => {
  it('creates one notice through the transaction client when a PAUSED membership exists', async () => {
    const { notifyPurchaseWithPausedMembership } = await import('@/lib/notifications/create')
    const create = vi.fn()
    const tx = {
      membership: { findFirst: vi.fn().mockResolvedValue({ planName: 'Jiu Jitsu Mensual' }) },
      user: { findUnique: vi.fn().mockResolvedValue({ name: 'Ana', email: 'a@test.local' }) },
      schoolMember: { findUnique: vi.fn().mockResolvedValue({ id: 'sm_1' }) },
      notification: { create },
    }
    const made = await notifyPurchaseWithPausedMembership(tx as never, { schoolId: 's', userId: 'u', newMembershipId: 'm_new', newPlanName: 'Pase 1 Semana' })
    expect(made).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { schoolId: 's', href: '/dashboard/users/sm_1' } })
    expect(tx.membership.findFirst.mock.calls[0]?.[0]).toMatchObject({ where: { status: 'PAUSED', id: { not: 'm_new' } } })
  })
  it('does nothing without a PAUSED membership', async () => {
    const { notifyPurchaseWithPausedMembership } = await import('@/lib/notifications/create')
    const create = vi.fn()
    const tx = { membership: { findFirst: vi.fn().mockResolvedValue(null) }, user: { findUnique: vi.fn() }, schoolMember: { findUnique: vi.fn() }, notification: { create } }
    expect(await notifyPurchaseWithPausedMembership(tx as never, { schoolId: 's', userId: 'u', newMembershipId: 'm', newPlanName: 'P' })).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })
})
