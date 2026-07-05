/**
 * Revolut Merchant API client.
 * Docs: https://developer.revolut.com/docs/merchant
 *
 * Each school supplies its own secret key — never use a shared/platform key here.
 */

const REVOLUT_API = 'https://merchant.revolut.com/api/1.0'

export interface RevolutOrder {
  id: string
  token: string
  type: string
  state: string
  checkout_url: string
  amount: number
  currency: string
  merchant_order_ext_ref?: string
}

interface CreateOrderParams {
  secretKey: string
  amount: number        // in minor units (cents) — e.g. 7000 for 70.00 EUR
  currency: string      // ISO 4217 — e.g. "EUR"
  merchantOrderRef: string  // your internal ID (unique per school)
  description?: string
  email?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export async function createRevolutOrder(params: CreateOrderParams): Promise<RevolutOrder> {
  const { secretKey, amount, currency, merchantOrderRef, description, email, successUrl, cancelUrl, metadata } = params

  const res = await fetch(`${REVOLUT_API}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      'Revolut-Api-Version': '2024-09-01',
    },
    body: JSON.stringify({
      amount,
      currency: currency.toUpperCase(),
      capture_mode: 'AUTOMATIC',
      merchant_order_ext_ref: merchantOrderRef,
      ...(description && { description }),
      ...(email && { email }),
      redirect_url: successUrl,
      cancel_redirect_url: cancelUrl,
      ...(metadata && { metadata }),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Revolut API error ${res.status}: ${err}`)
  }

  return res.json()
}

export async function getRevolutOrder(secretKey: string, orderId: string): Promise<RevolutOrder> {
  const res = await fetch(`${REVOLUT_API}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Revolut-Api-Version': '2024-09-01',
    },
  })

  if (!res.ok) throw new Error(`Revolut API error ${res.status}`)
  return res.json()
}

export async function refundRevolutOrder(secretKey: string, orderId: string, amount?: number): Promise<void> {
  const res = await fetch(`${REVOLUT_API}/orders/${orderId}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      'Revolut-Api-Version': '2024-09-01',
    },
    body: JSON.stringify({ ...(amount !== undefined && { amount }) }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Revolut refund error ${res.status}: ${err}`)
  }
}

/**
 * Verify a Revolut webhook signature.
 * Per Revolut's docs, the signed payload is `v1.{timestamp}.{rawBody}`, HMAC-SHA256'd
 * with the webhook's signing secret, sent as `Revolut-Signature: v1=<hex>` alongside
 * `Revolut-Request-Timestamp: <epoch ms>`. Multiple signatures may be comma-separated
 * when more than one signing secret is active. Timestamps older than 5 minutes are
 * rejected as a replay-protection measure (Revolut's own recommended tolerance).
 */
export async function verifyRevolutWebhook(
  rawBody: string,
  signatureHeader: string,
  timestampHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  const timestamp = Number(timestampHeader)
  if (!timestamp || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false

  const signatures = signatureHeader.split(',').map(s => s.trim())
  const v1 = signatures.find(s => s.startsWith('v1='))?.slice(3)
  if (!v1) return false

  const payloadToSign = `v1.${timestampHeader}.${rawBody}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadToSign))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return hex === v1
}
