/** Balance API: analytics permission to read, payments.manage to copy expenses; copy rules. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireSchoolAccess: vi.fn(),
  school: vi.fn(), txFindMany: vi.fn(), txFindFirst: vi.fn(), txCount: vi.fn(), txCreate: vi.fn(), exec: vi.fn(), transaction: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: m.requireSchoolAccess }))
vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: m.school },
    transaction: { findMany: m.txFindMany, findFirst: m.txFindFirst, create: m.txCreate },
    $transaction: m.transaction,
  },
}))

const { GET } = await import('@/app/api/dashboard/balance/route')
const { POST } = await import('@/app/api/dashboard/balance/copy-expenses/route')
const { POST: ADD } = await import('@/app/api/dashboard/balance/expense/route')
const add = (body: unknown) => ADD(new NextRequest('http://localhost/api/dashboard/balance/expense', { method: 'POST', body: JSON.stringify(body) }))
const get = () => GET(new NextRequest('http://localhost/api/dashboard/balance?period=12m'))
const post = (month: string) => POST(new NextRequest('http://localhost/api/dashboard/balance/copy-expenses', { method: 'POST', body: JSON.stringify({ month }) }))

beforeEach(() => {
  vi.clearAllMocks()
  m.getAuthUser.mockResolvedValue({ id: 'u', role: 'USER' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireSchoolAccess.mockResolvedValue({ role: 'OWNER', customRoleId: null, status: 'ACTIVE' })
  m.school.mockResolvedValue({ country: 'ES' })
  m.txFindMany.mockResolvedValue([])
  m.txFindFirst.mockResolvedValue(null)
  const tx = { $executeRaw: m.exec, transaction: { count: m.txCount, findFirst: m.txFindFirst, findMany: m.txFindMany, create: m.txCreate } }
  m.transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx))
  m.txCreate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve({ id: 'new', data }))
})

describe('GET balance', () => {
  it('owner reads it and may manage; an instructor (no analytics permission) gets 403', async () => {
    const d = await (await get()).json()
    expect(d).toMatchObject({ period: '12m', canManage: true })
    expect(d.months).toHaveLength(12)
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'INSTRUCTOR', customRoleId: null, status: 'ACTIVE' })
    expect((await get()).status).toBe(403)
    m.requireSchoolAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))
    expect((await get()).status).toBe(403)
  })
})

describe('POST copy-expenses', () => {
  it('copies the last month with expenses into an empty month, same day (clamped)', async () => {
    m.txCount.mockResolvedValueOnce(0)
    m.txFindFirst.mockResolvedValueOnce({ date: new Date('2025-11-30T11:00:00Z') })
    m.txFindMany.mockResolvedValueOnce([
      { category: 'RENT', amount: 500, currency: 'EUR', description: 'Alquiler', paymentMethod: 'BANK_TRANSFER', date: new Date('2025-11-01T11:00:00Z') },
      { category: 'SALARY', amount: 1900, currency: 'EUR', description: 'Salario', paymentMethod: null, date: new Date('2025-11-30T11:00:00Z') },
    ])
    const res = await post('2026-02')
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ created: 2, from: '2025-11' })
    const dates = m.txCreate.mock.calls.map(c => c[0].data.date.toISOString())
    expect(dates).toEqual(['2026-02-01T11:00:00.000Z', '2026-02-28T11:00:00.000Z']) // 12:00 Madrid; 30 → 28 Feb
    expect(m.txCreate.mock.calls[0]![0].data).toMatchObject({ type: 'EXPENSE', status: 'PAID', category: 'RENT', amount: 500, notes: 'Copied from 2025-11' })
  })

  it('refuses a month that already has expenses, a future month, nothing to copy, bad input', async () => {
    m.txCount.mockResolvedValueOnce(3)
    expect((await post('2026-10')).status).toBe(409)
    expect((await post('2099-01')).status).toBe(400)
    expect((await post('2026-13')).status).toBe(400)
    m.txCount.mockResolvedValueOnce(0)
    m.txFindFirst.mockResolvedValueOnce(null)
    expect((await post('2026-10')).status).toBe(404)
    expect(m.txCreate).not.toHaveBeenCalled()
  })

  it('needs payments.manage: a manager-less role gets 403', async () => {
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'INSTRUCTOR', customRoleId: null, status: 'ACTIVE' })
    expect((await post('2026-10')).status).toBe(403)
  })
})

describe('re-audit fixes (PR #50)', () => {
  it('P2: copy is offered only where the endpoint accepts it — expenses in another currency block it', async () => {
    const oct = new Date('2026-10-15T10:00:00Z')
    m.txFindMany
      .mockResolvedValueOnce([{ id: 'i', type: 'INCOME', category: 'MEMBERSHIP', amount: 5000, currency: 'EUR', date: oct, description: null }]) // PAID in period
      .mockResolvedValueOnce([{ date: oct }]) // any expense in the period (a GBP one)
    m.txFindFirst
      .mockResolvedValueOnce(null) // last expense up to now (EUR view)
      .mockResolvedValueOnce({ date: new Date('2025-11-01T11:00:00Z') }) // first expense ever
    const d = await (await GET(new NextRequest('http://localhost/api/dashboard/balance?period=12m'))).json()
    const october = d.months.find((x: { key: string }) => x.key === '2026-10')
    expect(october).toMatchObject({ missingExpenses: true, copyable: false, expensesElsewhere: true })
    const september = d.months.find((x: { key: string }) => x.key === '2026-09')
    expect(september).toMatchObject({ copyable: true })
  })

  it('P2: an added expense is stored at 12:00 school time on that day, DST days included', async () => {
    m.txCreate.mockResolvedValue({ id: 'x' })
    expect((await add({ category: 'RENT', amount: 500, currency: 'EUR', date: '2026-10-25' })).status).toBe(201)
    expect(m.txCreate.mock.calls.at(-1)![0].data).toMatchObject({ type: 'EXPENSE', status: 'PAID', category: 'RENT', amount: 500, date: new Date('2026-10-25T11:00:00Z') })
    await add({ category: 'SALARY', amount: 1900, currency: 'EUR', date: '2026-03-29' })
    expect(m.txCreate.mock.calls.at(-1)![0].data.date).toEqual(new Date('2026-03-29T10:00:00Z'))
  })

  it('add expense validates input and needs payments.manage', async () => {
    expect((await add({ category: 'CAKE', amount: 5, currency: 'EUR', date: '2026-10-01' })).status).toBe(400)
    expect((await add({ category: 'RENT', amount: 0, currency: 'EUR', date: '2026-10-01' })).status).toBe(400)
    expect((await add({ category: 'RENT', amount: 5, currency: 'EUR', date: '2026-02-30' })).status).toBe(400)
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'INSTRUCTOR', customRoleId: null, status: 'ACTIVE' })
    expect((await add({ category: 'RENT', amount: 5, currency: 'EUR', date: '2026-10-01' })).status).toBe(403)
  })
})
