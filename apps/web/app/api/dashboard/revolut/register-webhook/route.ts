import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

const REVOLUT_API = 'https://merchant.revolut.com/api/1.0'

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
  const webhookUrl = `${origin}/api/webhooks/revolut`
  const authHeaders = {
    'Authorization': `Bearer ${school.revolutSecretKey}`,
    'Content-Type': 'application/json',
    'Revolut-Api-Version': '2024-09-01',
  }

  const createWebhook = () => fetch(`${REVOLUT_API}/webhooks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      url: webhookUrl,
      events: ['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED'],
    }),
  })

  let res = await createWebhook()

  if (!res.ok) {
    const err = await res.text()
    console.error('[revolut register-webhook] status:', res.status, 'body:', err, 'webhookUrl:', webhookUrl)

    // 422 means a webhook for this URL already exists. Revolut only returns the
    // signing_secret at creation time, so if we don't have one stored yet, delete
    // the stale registration and recreate it to capture a fresh, verifiable secret.
    if (res.status === 422 && err.includes('already')) {
      try {
        const list = await fetch(`${REVOLUT_API}/webhooks`, { headers: authHeaders }).then(r => r.json())
        const stale = Array.isArray(list) ? list.find((w: { url?: string }) => w.url === webhookUrl) : null
        if (stale?.id) {
          await fetch(`${REVOLUT_API}/webhooks/${stale.id}`, { method: 'DELETE', headers: authHeaders })
          res = await createWebhook()
        }
      } catch (e) {
        console.error('[revolut register-webhook] re-registration attempt failed:', e)
      }

      if (!res.ok) {
        return NextResponse.json({
          ok: true,
          message: 'Webhook already registered, but the signing secret could not be refreshed automatically — remove the webhook from your Revolut dashboard and click Register again.',
        })
      }
    } else {
      return NextResponse.json({ error: `Revolut error ${res.status}: ${err}`, webhookUrl }, { status: 400 })
    }
  }

  const data = await res.json() as { signing_secret?: string }

  if (data.signing_secret) {
    await prisma.school.update({
      where: { id: schoolId },
      data: { revolutWebhookSecret: data.signing_secret },
    })
  }

  // Never echo `data` as-is — Revolut's create-webhook response includes the
  // plaintext signing_secret, which we've already persisted server-side above.
  return NextResponse.json({ ok: true, signatureVerificationEnabled: Boolean(data.signing_secret) })
}
