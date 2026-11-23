import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildClaimVerifyEmail, claimLang } from '@/lib/email/templates/claimEmails'
import { recordClaimEventSafe } from './events'
import type { ResolvedInvitation } from './accept'

// Emails a Supabase-signed sign-in link to the invited address. Redeeming it
// (via /auth/confirm) proves inbox control, confirms the email and brings the
// person back to /claim/[token] signed in, where they accept explicitly.
//
// New address  → generateLink('invite'): creates an UNCONFIRMED account.
// Known address → generateLink('magiclink'): signs in, password untouched.
// We try 'invite' first and fall back to 'magiclink' when the address already
// exists in Auth (covers Auth users with no linked Prisma row too).
export async function sendClaimVerification(inv: ResolvedInvitation, rawToken: string, uiLocale?: string): Promise<boolean> {
  const email = inv.sentToEmail
  if (!email) return false
  const admin = createAdminClient()
  const redirectTo = `${APP_URL}/auth/confirm?redirect=${encodeURIComponent(`/claim/${rawToken}`)}`

  let link: string | undefined
  const invite = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
  link = invite.data?.properties?.action_link
  if (invite.error || !link) {
    const magic = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
    link = magic.data?.properties?.action_link
    if (magic.error || !link) {
      console.error('[claim/verify] generateLink failed:', invite.error?.message, magic.error?.message)
      return false
    }
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
