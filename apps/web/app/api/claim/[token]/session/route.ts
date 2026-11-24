import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { resolveToken } from '@/lib/claims/accept'
import { hashInvitationToken, normalizeEmail } from '@/lib/claims/token'
import { VERIFY_OTP_TYPES, type VerifyOtpType } from '@/lib/claims/verify'
import { isRateLimited } from '@/lib/rateLimit'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

// POST /api/claim/[token]/session { tokenHash, type } — redeems the one-time
// Supabase token from the verification email server-side (verifyOtp) and
// writes the session cookies on this response. Called by /claim/[token] after
// an explicit click. It only signs the person in as the invited address; it
// never accepts the invitation (that stays POST /complete).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (
    isRateLimited(`claim-session:ip:${clientIp(req)}`, 20, 60 * 60 * 1000) ||
    isRateLimited(`claim-session:token:${hashInvitationToken(token)}`, 10, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  const body = await req.json().catch(() => ({})) as { tokenHash?: unknown; type?: unknown }
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash : ''
  const type = VERIFY_OTP_TYPES.find(t => t === body.type) as VerifyOtpType | undefined
  if (!tokenHash || tokenHash.length > 200 || !type) return NextResponse.json({ error: 'verify_invalid' }, { status: 400 })

  const res = await resolveToken(token)
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: res.reason === 'NOT_FOUND' ? 404 : 410 })
  const expected = normalizeEmail(res.invitation.sentToEmail ?? '')

  const response = NextResponse.json({ ok: true })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: cs => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  )
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error || !data.user) return NextResponse.json({ error: 'verify_expired' }, { status: 410 })
  // The token was minted for the invited address; anything else is dropped
  // together with the cookies it would have set.
  if (!expected || normalizeEmail(data.user.email ?? '') !== expected) {
    return NextResponse.json({ error: 'WRONG_ACCOUNT' }, { status: 403 })
  }
  return response
}
