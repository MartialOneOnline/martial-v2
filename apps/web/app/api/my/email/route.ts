import { NextResponse } from 'next/server'
import { isApplePrivateRelayEmail } from '@/lib/privateRelay'
import { isRateLimited } from '@/lib/rateLimit'
import { reconcileEmailChange, requestEmailChange } from '@/lib/emailChange'
import { emailChangeDeps, prismaEmailChangeStore } from '@/lib/emailChangeStore'
import { emailChangeError, getEmailChangeUser } from '@/lib/emailChangeHttp'

// Swapping an Apple "Hide My Email" relay address for a real one, verified
// by a 6-digit code (lib/emailChange.ts). Only for relay accounts; every
// other email change stays admin/support-only.

// GET /api/my/email — current email, whether it is a relay address, and any
// pending change. Also repairs a change that failed midway.
export async function GET() {
  const user = await getEmailChangeUser()
  if (!user) return emailChangeError('unauthorized')
  await reconcileEmailChange(emailChangeDeps(), user)
  const email = (await prismaEmailChangeStore.getUserEmail(user.id)) ?? user.email
  const pending = await prismaEmailChangeStore.getRequest(user.id)
  return NextResponse.json({
    email,
    isRelay: isApplePrivateRelayEmail(email),
    pending: pending && pending.status === 'PENDING' && pending.expiresAt > new Date()
      ? { email: pending.newEmail, expiresAt: pending.expiresAt }
      : null,
  })
}

// POST /api/my/email { email, lang } — sends a code to the new address.
// The account's email does not change until POST /api/my/email/confirm.
export async function POST(req: Request) {
  const user = await getEmailChangeUser()
  if (!user) return emailChangeError('unauthorized')
  if (isRateLimited(`my-email:${user.id}`, 5, 60 * 60 * 1000)) return emailChangeError('rate_limited')

  let body: { email?: unknown; lang?: unknown }
  try { body = await req.json() } catch { return emailChangeError('bad_request') }

  const result = await requestEmailChange(emailChangeDeps(), user, {
    email: body.email,
    lang: typeof body.lang === 'string' ? body.lang : null,
  })
  if (!result.ok) return emailChangeError(result.error)
  return NextResponse.json({ ok: true, pending: { email: result.email, expiresAt: result.expiresAt } })
}
