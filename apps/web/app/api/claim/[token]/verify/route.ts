import { NextRequest, NextResponse } from 'next/server'
import { resolveToken } from '@/lib/claims/accept'
import { sendClaimVerification } from '@/lib/claims/verify'
import { hashInvitationToken } from '@/lib/claims/token'
import { isRateLimited } from '@/lib/rateLimit'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

// POST /api/claim/[token]/verify — emails a Supabase-signed link to the
// invited address only (never to a client-supplied one). Redeeming it proves
// control of that inbox and signs the person in; for a new person it creates
// an unconfirmed account that is confirmed by that same click. Existing
// accounts get a magic link: their password is never touched.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (
    isRateLimited(`claim-verify:ip:${clientIp(req)}`, 10, 60 * 60 * 1000) ||
    isRateLimited(`claim-verify:token:${hashInvitationToken(token)}`, 5, 60 * 60 * 1000)
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  const res = await resolveToken(token)
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: res.reason === 'NOT_FOUND' ? 404 : 410 })

  const body = await req.json().catch(() => ({})) as { locale?: string }
  const sent = await sendClaimVerification(res.invitation, token, body.locale)
  if (!sent) return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
