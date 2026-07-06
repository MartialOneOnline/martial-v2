import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

const REVOLUT_API = 'https://merchant.revolut.com/api/1.0'
const API_VERSION = '2024-09-01'
const WEBHOOK_EVENTS = ['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED']

// Revolut's structured error code for "a webhook already exists for this URL".
// Observed in production as HTTP 400 (not the 422 the Merchant API docs imply),
// so we key off the code itself rather than the status.
const DUPLICATE_WEBHOOK_CODE = 1041

interface RevolutApiError {
  code?: number
  message?: string
  errorId?: string
}

function parseRevolutError(raw: string): RevolutApiError {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// POST /api/dashboard/revolut/register-webhook
// Registers the Revolut webhook URL for this school using their secret key.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { revolutSecretKey: true },
  })

  if (!school?.revolutSecretKey)
    return NextResponse.json({ error: 'Save your Revolut secret key first' }, { status: 400 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'

  // A webhook Revolut can't reach is worse than no webhook — refuse rather than
  // silently register something that will never deliver events.
  if (process.env.NODE_ENV === 'production' && (!/^https:\/\//.test(origin) || /localhost|127\.0\.0\.1/.test(origin))) {
    console.error('[revolut register-webhook]', JSON.stringify({
      provider: 'revolut', action: 'register_webhook', schoolId,
      environment: process.env.NODE_ENV, origin, error: 'refused_invalid_production_origin',
    }))
    return NextResponse.json({ error: `Refusing to register a non-public webhook URL in production: ${origin}` }, { status: 400 })
  }

  const webhookUrl = `${origin.replace(/\/+$/, '')}/api/webhooks/revolut`
  const secretKey = school.revolutSecretKey
  const authHeaders = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    'Revolut-Api-Version': API_VERSION,
  }

  function log(extra: Record<string, unknown>) {
    console.error('[revolut register-webhook]', JSON.stringify({
      provider: 'revolut',
      action: 'register_webhook',
      schoolId,
      environment: process.env.NODE_ENV,
      endpointUsed: `${REVOLUT_API}/webhooks`,
      apiVersion: API_VERSION,
      webhookUrl,
      events: WEBHOOK_EVENTS,
      hasSecretKey: true,
      secretLast4: secretKey.slice(-4),
      ...extra,
    }))
  }

  const createWebhook = () => fetch(`${REVOLUT_API}/webhooks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ url: webhookUrl, events: WEBHOOK_EVENTS }),
  })

  let res = await createWebhook()

  if (!res.ok) {
    const errText = await res.text()
    const revolutError = parseRevolutError(errText)
    log({ status: res.status, revolutErrorCode: revolutError.code, revolutErrorId: revolutError.errorId })

    // "Webhook already exists for this URL." Revolut's Merchant API has been observed
    // returning this as HTTP 400 with code 1041 (not the 422 + "already" text the
    // docs describe) — check the structured code first, fall back to the older shape.
    const isDuplicateUrl = revolutError.code === DUPLICATE_WEBHOOK_CODE || (res.status === 422 && errText.includes('already'))

    if (isDuplicateUrl) {
      // Revolut only returns the signing_secret at creation time, so if we don't have
      // one stored yet, delete the stale registration and recreate it to capture a
      // fresh, verifiable secret.
      try {
        const list = await fetch(`${REVOLUT_API}/webhooks`, { headers: authHeaders }).then(r => r.json())
        const stale = Array.isArray(list) ? list.find((w: { url?: string }) => w.url === webhookUrl) : null
        if (stale?.id) {
          await fetch(`${REVOLUT_API}/webhooks/${stale.id}`, { method: 'DELETE', headers: authHeaders })
          res = await createWebhook()
        }
      } catch (e) {
        log({ recreateAttemptFailed: e instanceof Error ? e.message : String(e) })
      }

      if (!res.ok) {
        const retryErrText = await res.text()
        const retryError = parseRevolutError(retryErrText)
        log({ status: res.status, revolutErrorCode: retryError.code, revolutErrorId: retryError.errorId, phase: 'recreate' })
        return NextResponse.json({
          error: `Webhook already registered but could not be refreshed automatically (Revolut error ${res.status}, code ${retryError.code ?? 'unknown'}). Remove the webhook from your Revolut dashboard and click Register again.`,
          webhookUrl,
        }, { status: 502 })
      }
    } else {
      return NextResponse.json({
        error: `Revolut error ${res.status} (code ${revolutError.code ?? 'unknown'}): ${revolutError.message ?? errText}`,
        webhookUrl,
        revolutErrorId: revolutError.errorId,
      }, { status: 400 })
    }
  }

  const data = await res.json() as { signing_secret?: string }

  if (data.signing_secret) {
    await prisma.school.update({
      where: { id: schoolId },
      data: { revolutWebhookSecret: data.signing_secret },
    })
  }

  log({ status: 200, result: 'registered', signingSecretStored: Boolean(data.signing_secret) })

  // Never echo `data` as-is — Revolut's create-webhook response includes the
  // plaintext signing_secret, which we've already persisted server-side above.
  return NextResponse.json({ ok: true, signatureVerificationEnabled: Boolean(data.signing_secret) })
}
