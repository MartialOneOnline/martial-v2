/**
 * alertWebhookFailure runs inside the webhook's error path, so the contract is:
 * email the configured super admin (falling back to support@), escape anything
 * that came from the event payload, and NEVER throw — a broken alert must not
 * change what the webhook returns to Stripe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()
vi.mock('@/lib/email/resend', () => ({
  FROM: 'Martial <notifications@martialapp.com>',
  getResend: () => ({ emails: { send: mockSend } }),
}))
const mockSettingsFind = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { platformSettings: { findUnique: mockSettingsFind } } }))

const { alertWebhookFailure } = await import('@/lib/alerts/webhookFailure')

const base = { provider: 'Stripe' as const, eventId: 'evt_1', eventType: 'checkout.session.completed', error: 'current transaction is aborted' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockResolvedValue({ data: { id: 'em_1' }, error: null })
  mockSettingsFind.mockResolvedValue({ superAdminEmail: 'owner@martial.test' })
})

describe('alertWebhookFailure', () => {
  it('emails the configured super admin with event id, type, error and a Stripe dashboard link', async () => {
    await alertWebhookFailure({ ...base, details: { Customer: 'a@b.com', Amount: '180.00 EUR' } })

    const arg = mockSend.mock.calls[0]![0]
    expect(arg.to).toBe('owner@martial.test')
    expect(arg.subject).toContain('checkout.session.completed')
    expect(arg.html).toContain('https://dashboard.stripe.com/events/evt_1')
    expect(arg.html).toContain('current transaction is aborted')
    expect(arg.html).toContain('a@b.com')
    expect(arg.html).toContain('180.00 EUR')
  })

  it('falls back to support@martialapp.com when no super admin email is configured', async () => {
    mockSettingsFind.mockResolvedValue({ superAdminEmail: null })
    await alertWebhookFailure(base)
    expect(mockSend.mock.calls[0]![0].to).toBe('support@martialapp.com')
  })

  it('escapes HTML from the payload', async () => {
    await alertWebhookFailure({ ...base, error: '<img src=x onerror=alert(1)>', details: { Customer: '"><script>x</script>' } })
    const html = mockSend.mock.calls[0]![0].html as string
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;img src=x')
  })

  it('omits detail rows with no value', async () => {
    await alertWebhookFailure({ ...base, details: { Customer: null, Plan: undefined, Amount: '5.00 EUR' } })
    const html = mockSend.mock.calls[0]![0].html as string
    expect(html).not.toContain('>Customer<')
    expect(html).toContain('5.00 EUR')
  })

  it('never throws when Resend errors, rejects, or the settings lookup fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } })
    await expect(alertWebhookFailure(base)).resolves.toBeUndefined()

    mockSend.mockRejectedValueOnce(new Error('network'))
    await expect(alertWebhookFailure(base)).resolves.toBeUndefined()

    mockSettingsFind.mockRejectedValueOnce(new Error('db down'))
    await expect(alertWebhookFailure(base)).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
