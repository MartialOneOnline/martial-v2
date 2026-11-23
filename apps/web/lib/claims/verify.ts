import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildClaimVerifyEmail, claimLang } from '@/lib/email/templates/claimEmails'
import { recordClaimEventSafe } from './events'
import type { ResolvedInvitation } from './accept'

// Emails a sign-in link for the invited address. Opening it and clicking
// "Confirm" on /claim/[token] proves inbox control: the server redeems the
// Supabase token with verifyOtp (POST /api/claim/[token]/session), which
// confirms the email and writes the session cookies, and the person accepts
// explicitly on the same page.
//
// Why not Supabase's action_link: it redirects with an implicit-flow #hash,
// which the PKCE browser client (@supabase/ssr) refuses, so a person without
// a previous session ended on /login without accepting. The hashed token is
// redeemed server-side instead (same as /auth/impersonate), and only after a
// click — a mail scanner prefetching the link cannot burn the one-time token.
//
// New address  → generateLink('invite'): creates an UNCONFIRMED account.
// Known address → generateLink('magiclink'): signs in, password untouched.
// We try 'invite' first and fall back to 'magiclink' when the address already
// exists in Auth (covers Auth users with no linked Prisma row too).
export const VERIFY_OTP_TYPES = ['invite', 'magiclink'] as const
export type VerifyOtpType = (typeof VERIFY_OTP_TYPES)[number]

export function claimVerifyUrl(rawToken: string, tokenHash: string, type: VerifyOtpType): string {
  return `${APP_URL}/claim/${encodeURIComponent(rawToken)}?verify=${encodeURIComponent(tokenHash)}&vt=${type}`
}

export async function sendClaimVerification(inv: ResolvedInvitation, rawToken: string, uiLocale?: string): Promise<boolean> {
  const email = inv.sentToEmail
  if (!email) return false
  const admin = createAdminClient()
  let link: string | undefined
  const invite = await admin.auth.admin.generateLink({ type: 'invite', email })
  if (!invite.error && invite.data?.properties?.hashed_token) {
    link = claimVerifyUrl(rawToken, invite.data.properties.hashed_token, 'invite')
  } else {
    const magic = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (magic.error || !magic.data?.properties?.hashed_token) {
      console.error('[claim/verify] generateLink failed:', invite.error?.message, magic.error?.message)
      return false
    }
    link = claimVerifyUrl(rawToken, magic.data.properties.hashed_token, 'magiclink')
  }

  const lang = claimLang(uiLocale ?? inv.claimRequest?.locale)
  const msg = buildClaimVerifyEmail({ lang, schoolName: inv.school?.name ?? inv.name, verifyUrl: link })
  try {
    const { error } = await getResend().emails.send({ from: FROM, to: email, subject: msg.subject, html: msg.html })
    if (error) {
      console.error('[claim/verify] Resend rejected the verification email:', error)
      return false
    }
  } catch (err) {
    console.error('[claim/verify] Resend failed:', err)
    return false
  }
  await recordClaimEventSafe(prisma, inv.claimRequestId, 'VERIFY_LINK_SENT', { data: { invitationId: inv.id } })
  return true
}
