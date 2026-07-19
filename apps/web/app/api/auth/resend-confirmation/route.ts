import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'
import { sendConfirmEmail } from '@/lib/email/sendConfirmEmail'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { isRateLimited } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Deliberately generous but bounded — this is a public, unauthenticated
// endpoint. Best-effort (see lib/rateLimit.ts), not a hard distributed cap.
const IP_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 } // 20/hour per IP
const EMAIL_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 } // 5/hour per email

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// POST /api/auth/resend-confirmation — re-sends the signup confirmation link.
//
// Always responds { ok: true } — for an unrecognized email, an invalid
// email, an already-confirmed account, or a rate-limited caller, this is a
// deliberate silent no-op, not a lie: telling the caller anything more
// specific (account doesn't exist / is already confirmed / is rate limited)
// would let this endpoint be used to enumerate registered or confirmed
// emails. The one case this endpoint DOES act on — a real, still-unconfirmed
// account — is exactly the one case where "we might have sent something" is
// true and safe to say.
//
// Critically, this must never become a passwordless-login channel: a
// magiclink is only ever generated for an account that is still
// unconfirmed. An already-confirmed account is a no-op here, full stop —
// see the email_confirmed_at check below.
export async function POST(req: NextRequest) {
  let body: { email?: string; redirect?: string; lang?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  // Never trust the client's own safeRedirect() call — re-sanitize server-side.
  const redirect = safeConfirmRedirect(body.redirect)
  const lang = body.lang

  if (isRateLimited(`resend-confirmation:ip:${clientIp(req)}`, IP_LIMIT.max, IP_LIMIT.windowMs)) {
    return NextResponse.json({ ok: true })
  }
  if (email && isRateLimited(`resend-confirmation:email:${email}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowMs)) {
    return NextResponse.json({ ok: true })
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { name: true, supabaseAuthId: true },
  })

  if (user?.supabaseAuthId) {
    try {
      const admin = createAdminClient()
      const { data: authUserRes, error: getErr } = await admin.auth.admin.getUserById(user.supabaseAuthId)

      if (getErr) {
        console.error('[resend-confirmation] getUserById failed:', getErr)
      } else if (authUserRes?.user && !authUserRes.user.email_confirmed_at) {
        const redirectTo = redirect
          ? `${APP_URL}/auth/confirm?redirect=${encodeURIComponent(redirect)}`
          : `${APP_URL}/auth/confirm`
        const { data, error } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo },
        })
        const confirmUrl = data?.properties?.action_link
        if (error || !confirmUrl) {
          console.error('[resend-confirmation] generateLink failed:', error)
        } else {
          await sendConfirmEmail({ recipientEmail: email, name: user.name, confirmUrl, lang })
        }
      }
      // else: already confirmed (or auth user missing) — silent no-op, see
      // the doc comment above.
    } catch (err) {
      console.error('[resend-confirmation] failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
