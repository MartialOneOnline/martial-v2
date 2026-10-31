import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'

// GET /api/auth/invite/[token] — the only link our invite emails send now
// (see lib/invites.ts). Our token's expiry is ours to control (7 days by
// default), completely independent of Supabase's shared Email OTP expiry.
//
// A real Supabase sign-in link only gets minted here, at the moment the
// invitee actually clicks — so it only has to survive the redirect that
// happens a few lines below, never the days an invitee takes to check their
// inbox. We also fetch that Supabase verify URL ourselves (redirect:
// 'manual') and relay its Location header, so the browser goes straight
// from martialapp.com to /auth/accept-invite and never shows
// <project-ref>.supabase.co in the address bar.
//
// Deliberately no single-use gate — see the InviteToken model comment in
// prisma/schema.prisma: corporate email scanners (Outlook Safe Links etc.)
// GET-fetch links before the user ever opens the email, which would burn a
// single-use token before the real click. expiresAt is the only guard.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const loginUrl = new URL('/login', APP_URL)

  const invite = await prisma.inviteToken.findUnique({ where: { token } })
  if (!invite) {
    loginUrl.searchParams.set('error', 'invalid_invite')
    loginUrl.searchParams.set('error_description', 'This invitation link is invalid.')
    return NextResponse.redirect(loginUrl)
  }
  if (invite.expiresAt < new Date()) {
    loginUrl.searchParams.set('error', 'invite_expired')
    loginUrl.searchParams.set('error_description', 'This invitation link has expired. Ask your school to resend it.')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createAdminClient()
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: invite.email,
    options: { redirectTo: invite.redirectTo },
  })

  let actionLink = linkData?.properties?.action_link
  if (linkError || !actionLink) {
    // Already-registered auth user (e.g. re-invited, or signed up another
    // way in the meantime) — 'invite' only works for brand-new users.
    const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invite.email,
      options: { redirectTo: invite.redirectTo },
    })
    actionLink = magicData?.properties?.action_link
    if (magicError || !actionLink) {
      loginUrl.searchParams.set('error', 'invite_failed')
      loginUrl.searchParams.set('error_description', 'Could not activate your account. Please ask your school to resend the invite.')
      return NextResponse.redirect(loginUrl)
    }
  }

  try {
    const verifyResponse = await fetch(actionLink, { redirect: 'manual' })
    const location = verifyResponse.headers.get('location')
    if (location) return NextResponse.redirect(location)
  } catch (err) {
    console.error('[invite-redeem] verify proxy failed, falling back to direct link:', err)
  }

  // Fallback — still works, just briefly shows the Supabase domain.
  return NextResponse.redirect(actionLink)
}
