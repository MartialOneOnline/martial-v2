/**
 * Lote AB follow-ups: the school bell write for a failed payment is awaited
 * and logged (never silently lost, never thrown), and a collectible checkout
 * on a school webhook only fulfils units of the school that verified it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNotificationCreate = vi.hoisted(() => vi.fn())
const mockUnitFindUnique = vi.hoisted(() => vi.fn())
const mockOrderCreate = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({
  prisma: {
    notification: { create: mockNotificationCreate },
    $transaction: (fn: (tx: unknown) => unknown) => fn({
      collectibleUnit: { findUnique: mockUnitFindUnique, updateMany: vi.fn() },
      order: { create: mockOrderCreate },
    }),
    user: { findUnique: vi.fn() },
    school: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/mergedUsers', () => ({ lockSurvivingUser: async (_tx: unknown, id: string) => id }))
vi.mock('@/lib/services/membership', () => ({ isSchoolMemberArchived: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/services/transactions', () => ({ recordOnlinePayment: vi.fn(), recordFlaggedPayment: vi.fn() }))
vi.mock('@/lib/email/sendEmails', () => ({ sendCollectibleReceiptEmail: vi.fn() }))
vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }))
vi.mock('@/lib/services/collectibles/reservation', () => ({ confirmSale: vi.fn() }))

const { notifyMembershipPaymentFailed } = await import('@/lib/notifications/create')
const { fulfillCollectibleCheckout } = await import('@/lib/services/collectibles/checkoutFulfillment')

beforeEach(() => vi.clearAllMocks())

describe('notifyMembershipPaymentFailed', () => {
  it('writes the bell notification and links to the member profile', async () => {
    mockNotificationCreate.mockResolvedValueOnce({})
    await expect(notifyMembershipPaymentFailed('school-1', 'Francis', '65 €', 'Jiu Jitsu Mensual', 'sm-1')).resolves.toBe(true)
    expect(mockNotificationCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      schoolId: 'school-1', type: 'PAYMENT_PENDING', title: 'Pago fallido', href: '/dashboard/users/sm-1',
      body: expect.stringContaining('65 € a Francis por Jiu Jitsu Mensual'),
    }) })
  })

  it('logs a DB failure and resolves false instead of throwing or swallowing it silently', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNotificationCreate.mockRejectedValueOnce(new Error('db down'))
    await expect(notifyMembershipPaymentFailed('school-1', 'Francis', '65 €', 'Plan')).resolves.toBe(false)
    expect(err).toHaveBeenCalledWith(expect.stringContaining('payment-failed notice for school school-1 not saved'), expect.any(Error))
    err.mockRestore()
  })
})

describe('fulfillCollectibleCheckout expectedSchoolId', () => {
  const unit = (schoolId: string | null) => ({
    editionNumber: 1, publicVerificationCode: 'X', tier: { name: 'T' },
    collection: { id: 'c1', name: 'C', schoolId, totalUnits: 10 },
  })
  const params = { collectibleUnitId: 'u1', userId: 'user-1', amountTotalCents: 1000, currency: 'eur', stripePaymentIntentId: 'pi_1' }

  it('ignores a unit of another school', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUnitFindUnique.mockResolvedValueOnce(unit('school-2'))
    await fulfillCollectibleCheckout({ ...params, expectedSchoolId: 'school-1' })
    expect(mockOrderCreate).not.toHaveBeenCalled()
    err.mockRestore()
  })

  it('ignores a Martial-sold unit arriving on a school webhook', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUnitFindUnique.mockResolvedValueOnce(unit(null))
    await fulfillCollectibleCheckout({ ...params, expectedSchoolId: 'school-1' })
    expect(mockOrderCreate).not.toHaveBeenCalled()
    err.mockRestore()
  })

  it('proceeds for a unit of the verifying school', async () => {
    mockUnitFindUnique.mockResolvedValueOnce(unit('school-1'))
    mockOrderCreate.mockResolvedValueOnce({ id: 'o1' })
    await fulfillCollectibleCheckout({ ...params, expectedSchoolId: 'school-1' })
    expect(mockOrderCreate).toHaveBeenCalledTimes(1)
  })
})
