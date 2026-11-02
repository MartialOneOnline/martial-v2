/** convertLeadAfterPaidActivation: awaited, paid only, never throws. */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ userFindUnique: vi.fn(), leadUpdateMany: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: m.userFindUnique }, lead: { updateMany: m.leadUpdateMany } } }))

const { convertLeadAfterPaidActivation } = await import('@/lib/leads')

beforeEach(() => {
  vi.clearAllMocks()
  m.userFindUnique.mockResolvedValue({ email: 'Rafa@Example.com' })
  m.leadUpdateMany.mockResolvedValue({ count: 1 })
})

describe('convertLeadAfterPaidActivation', () => {
  it('converts the lead (case-insensitive email) before returning', async () => {
    await convertLeadAfterPaidActivation('s', 'u', 'test', { price: 65 })
    expect(m.leadUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's', email: { equals: 'Rafa@Example.com', mode: 'insensitive' } }),
      data: expect.objectContaining({ status: 'CONVERTED', convertedUserId: 'u' }),
    }))
  })
  it('a captured card payment (no price given) converts too', async () => {
    await convertLeadAfterPaidActivation('s', 'u', 'stripe webhook')
    expect(m.leadUpdateMany).toHaveBeenCalledTimes(1)
  })
  it('a free trial is not a conversion', async () => {
    await convertLeadAfterPaidActivation('s', 'u', 'test', { price: 0 })
    expect(m.leadUpdateMany).not.toHaveBeenCalled()
  })
  it('a CRM failure never fails the payment', async () => {
    m.leadUpdateMany.mockRejectedValue(new Error('db down'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(convertLeadAfterPaidActivation('s', 'u', 'test', { price: 65 })).resolves.toBeUndefined()
    expect(err).toHaveBeenCalled()
  })
})
