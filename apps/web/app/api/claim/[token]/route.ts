import { NextRequest, NextResponse } from 'next/server'
import { resolveToken, markOpened } from '@/lib/claims/accept'
import { maskEmail } from '@/lib/claims/token'
import { getAuthIdentity } from '@/lib/claims/session'

// GET /api/claim/[token] — public, read-only. Shows the minimum the invitee
// needs (school, masked address) and whether the current session can accept.
// Never consumes the invitation and never creates accounts.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = await resolveToken(token)
  if (!res.ok) {
    // Coarse on purpose: used vs revoked vs expired is all the invitee needs.
    return NextResponse.json({ error: res.reason }, { status: res.reason === 'NOT_FOUND' ? 404 : 410 })
  }
  const inv = res.invitation
  await markOpened(inv)

  const expected = (inv.sentToEmail ?? '').toLowerCase()
  const auth = await getAuthIdentity()
  const session = !auth?.email ? 'none' : auth.email.toLowerCase() === expected ? 'match' : 'other'

  return NextResponse.json({
    schoolName: inv.school?.name ?? inv.name,
    city: inv.school?.city ?? inv.city,
    country: inv.school?.country ?? inv.country,
    logoUrl: inv.school?.logoUrl ?? null,
    maskedEmail: maskEmail(expected),
    expiresAt: inv.expiresAt,
    session,
    locale: inv.claimRequest?.locale ?? null,
  })
}
