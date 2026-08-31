import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'
import { sendResetPasswordEmail } from '@/lib/email/sendResetPasswordEmail'
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

// POST /api/auth/forgot-password — sends the password-reset link.
//
// Replaces the old direct `supabase.auth.resetPasswordForEmail()` call from
// the browser. That method sends Supabase's own (unbranded, English-only)
// email whose link relies on the PKCE code flow @supabase/ssr forces client
// side — the code is only redeemable from the exact browser/tab that
// requested it, via a `code_verifier` stashed in that tab's localStorage.
// Opening the emailed link from a different tab or app (the normal way
// anyone reads email — tap the link in Gmail, land in a fresh browser tab)
// has no matching verifier, so the reset silently fails and
// /auth/reset-password reports a false "link expired".
//
// This route sidesteps that entirely: admin.generateLink() produces a
// server-issued link (same mechanism as the register/invite confirmation
// flows — see sendConfirmationLink in app/api/auth/register/route.ts) that
// redeems via a hash-fragment token on Supabase's own verify endpoint, with
// no browser-side state required. It works from any device/tab.
//
// Always responds { ok: true } — see resend-confirmation/route.ts for why
// (this must not become an email-enumeration oracle).
export async function POST(req: NextRequest) {
  let body: { email?: string; lang?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const lang = body.lang

  if (isRateLimited(`forgot-password:ip:${clientIp(req)}`, IP_LIMIT.max, IP_LIMIT.windowMs)) {
    return NextResponse.json({ ok: true })
  }
  if (email && isRateLimited(`forgot-password:email:${email}`, EMAIL_LIMIT.max, EMAIL_LIMIT.windowMs)) {
    return NextResponse.json({ ok: true })
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { name: true },
  })

  // Gate on the Prisma User existing, not on supabaseAuthId being linked yet
  // — a user who was invited but never finished /auth/set-password (so our
  // side never auto-linked the two ids) still has a real Supabase auth
  // account and needs to be able to recover into it. generateLink is the
  // actual source of truth for whether that Supabase account exists.
  if (user) {
    try {
      const admin = createAdminClient()
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${APP_URL}/auth/reset-password` },
      })
      const resetUrl = data?.properties?.action_link
      if (error || !resetUrl) {
        console.error('[forgot-password] generateLink failed:', error)
      } else {
        await sendResetPasswordEmail({ recipientEmail: email, name: user.name, resetUrl, lang })
      }
    } catch (err) {
      console.error('[forgot-password] failed:', err)
    }
  }
  // else: no matching account — silent no-op, see doc comment above.

  return NextResponse.json({ ok: true })
}
