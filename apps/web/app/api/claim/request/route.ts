import { NextRequest, NextResponse } from 'next/server'
import { submitClaimRequest } from '@/lib/claims/requests'
import { ClaimError } from '@/lib/claims/errors'
import { isRateLimited } from '@/lib/rateLimit'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

// POST /api/claim/request — public. A visitor asks to manage a school. The
// request is saved first (Admin → Verification Queue → Ownership requests);
// emails are best-effort. Nothing is granted here. The response never echoes
// request data back.
export async function POST(req: NextRequest) {
  if (isRateLimited(`claim-request:ip:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  try {
    await submitClaimRequest(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ClaimError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    console.error('[claim request] failed:', err)
    return NextResponse.json({ error: 'Could not save the request' }, { status: 500 })
  }
}
