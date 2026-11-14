/**
 * PATCH /api/dashboard/members/[id]/membership, action 'undoCancel', through
 * the real route and the real undoCancelMembership(). Project Audit (P1 on
 * a7789d0): no path may put the school's Stripe secret in the JSON.
 *
 * The fake Prisma behaves like the real one: relations only come back when
 * `include`/`select` asks for them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const SECRET = 'sk_live_DO_NOT_LEAK'
type Row = { id: string; schoolId: string; status: string; cancelledAt: Date | null; stripeSubId: string | null; notes: string | null }
let rows: Record<string, Row> = {}
const withRelations = (r: Row | undefined, args: { include?: { school?: unknown } }) =>
  r ? { ...r, ...(args.include?.school ? { school: { stripeSecretKey: SECRET } } : {}) } : null

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: {
      findFirst: async (args: { where: { id: string; schoolId: string }; include?: { school?: unknown } }) => {
        const r = rows[args.where.id]
        return r && r.schoolId === args.where.schoolId ? withRelations(r, args) : null
      },
      findUnique: async (args: { where: { id: string }; include?: { school?: unknown } }) => withRelations(rows[args.where.id], args),
      updateMany: async (args: { where: { id: string }; data: Partial<Row> }) => {
        const r = rows[args.where.id]
        if (!r || r.status !== 'ACTIVE' || !r.cancelledAt) return { count: 0 }
        Object.assign(r, args.data)
        return { count: 1 }
      },
    },
  },
}))
const mockSubUpdate = vi.fn().mockResolvedValue({})
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ subscriptions: { update: (...a: unknown[]) => mockSubUpdate(...a), cancel: vi.fn() } }) }))
vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipReceiptEmail: vi.fn() }))
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: async () => ({ id: 'admin', role: 'SUPERADMIN' }),
  getCurrentSchoolId: async () => 's1',
}))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: vi.fn() }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission: vi.fn() }))

const { PATCH } = await import('@/app/api/dashboard/members/[id]/membership/route')

async function undo() {
  const req = new Request('http://x/api/dashboard/members/sm1/membership', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ membershipId: 'm1', action: 'undoCancel' }),
  })
  const res = await PATCH(req as never, { params: Promise.resolve({ id: 'sm1' }) })
  return { status: res.status, text: await res.text() }
}

beforeEach(() => {
  rows = { m1: { id: 'm1', schoolId: 's1', status: 'ACTIVE', cancelledAt: new Date('2026-11-14'), stripeSubId: 'sub_1', notes: null } }
  mockSubUpdate.mockClear()
})

describe('undoCancel HTTP response never carries credentials', () => {
  it('first undo (Stripe path): 200, cancelledAt cleared, no secret in the JSON', async () => {
    const r = await undo()
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toMatchObject({ id: 'm1', cancelledAt: null })
    expect(r.text).not.toContain(SECRET)
    expect(r.text).not.toContain('stripeSecretKey')
    expect(mockSubUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: false })
  })

  it('retry after it was already undone (idempotent path): 200, no secret in the JSON', async () => {
    await undo()
    const r = await undo()
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toMatchObject({ id: 'm1', cancelledAt: null })
    expect(r.text).not.toContain(SECRET)
    expect(r.text).not.toContain('stripeSecretKey')
    expect(mockSubUpdate).toHaveBeenCalledTimes(1)
  })

  it('refused paths: error JSON without the secret', async () => {
    rows.m1!.status = 'CANCELLED'
    const r = await undo()
    expect(r.status).toBe(400)
    expect(r.text).not.toContain(SECRET)
  })
})
