import { NextResponse } from 'next/server'
import { isRateLimited } from '@/lib/rateLimit'
import { confirmEmailChange } from '@/lib/emailChange'
import { emailChangeDeps } from '@/lib/emailChangeStore'
import { emailChangeError, getEmailChangeUser } from '@/lib/emailChangeHttp'

// POST /api/my/email/confirm { code } — applies the pending change once the
// 6-digit code sent to the new address matches (lib/emailChange.ts).

// Bounds how long an attempt can hold an APPLYING row (lib/emailChange.ts:
// must stay well under STALE_APPLYING_MS, see ROUTE_MAX_DURATION_S).
export const maxDuration = 30

export async function POST(req: Request) {
  const user = await getEmailChangeUser()
  if (!user) return emailChangeError('unauthorized')
  if (isRateLimited(`my-email-confirm:${user.id}`, 20, 60 * 60 * 1000)) return emailChangeError('rate_limited')

  let body: { code?: unknown }
  try { body = await req.json() } catch { return emailChangeError('bad_request') }

  const result = await confirmEmailChange(emailChangeDeps(), user, { code: body.code })
  if (!result.ok) return emailChangeError(result.error)
  return NextResponse.json({ ok: true, email: result.email })
}
