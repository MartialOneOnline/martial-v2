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

/**
 * Verify a Revolut webhook signature.
 * Revolut sends: Revolut-Signature: v1=<hmac_hex>
 * We compute HMAC-SHA256 over the raw body with the webhook secret.
 */
export async function verifyRevolutWebhook(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  const signatures = signatureHeader.split(',').map(s => s.trim())
  const v1 = signatures.find(s => s.startsWith('v1='))?.slice(3)
  if (!v1) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return hex === v1
}
