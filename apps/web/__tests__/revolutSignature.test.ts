/**
 * Tests for verifyRevolutWebhook() — HMAC signature check on the incoming
 * /api/webhooks/revolut endpoint. This is the P0 guard that stops forged
 * payment-completed events from anyone who knows the URL.
 */
import { describe, it, expect } from 'vitest'
import { verifyRevolutWebhook } from '@/lib/revolut'

const SECRET = 'wsk_test_signing_secret'
const BODY = JSON.stringify({ event: 'ORDER_COMPLETED', order_id: 'ord_123' })

async function sign(body: string, timestamp: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`v1.${timestamp}.${body}`))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

describe('verifyRevolutWebhook()', () => {
  it('accepts a correctly signed payload', async () => {
    const timestamp = String(Date.now())
    const hex = await sign(BODY, timestamp, SECRET)

    const ok = await verifyRevolutWebhook(BODY, `v1=${hex}`, timestamp, SECRET)
    expect(ok).toBe(true)
  })

  it('rejects a payload signed with the wrong secret', async () => {
    const timestamp = String(Date.now())
    const hex = await sign(BODY, timestamp, 'wrong_secret')

    const ok = await verifyRevolutWebhook(BODY, `v1=${hex}`, timestamp, SECRET)
    expect(ok).toBe(false)
  })

  it('rejects a tampered body', async () => {
    const timestamp = String(Date.now())
    const hex = await sign(BODY, timestamp, SECRET)
    const tamperedBody = JSON.stringify({ event: 'ORDER_COMPLETED', order_id: 'ord_999' })

    const ok = await verifyRevolutWebhook(tamperedBody, `v1=${hex}`, timestamp, SECRET)
    expect(ok).toBe(false)
  })

  it('rejects a stale timestamp (replay protection)', async () => {
    const staleTimestamp = String(Date.now() - 10 * 60 * 1000) // 10 min ago
    const hex = await sign(BODY, staleTimestamp, SECRET)

    const ok = await verifyRevolutWebhook(BODY, `v1=${hex}`, staleTimestamp, SECRET)
    expect(ok).toBe(false)
  })

  it('rejects a missing/malformed signature header', async () => {
    const timestamp = String(Date.now())
    const ok = await verifyRevolutWebhook(BODY, '', timestamp, SECRET)
    expect(ok).toBe(false)
  })

  it('handles multiple comma-separated signatures, matching any valid v1', async () => {
    const timestamp = String(Date.now())
    const hex = await sign(BODY, timestamp, SECRET)

    const ok = await verifyRevolutWebhook(BODY, `v0=deadbeef, v1=${hex}`, timestamp, SECRET)
    expect(ok).toBe(true)
  })
})
