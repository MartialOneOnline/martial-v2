import { getResend, FROM } from './resend'
import { buildResetPasswordEmail, getResetPasswordSubject } from './templates/resetPassword'
import { detectLang } from './templates/inviteStudent'

export interface ResetPasswordEmailPayload {
  recipientEmail: string
  name?: string | null
  resetUrl: string
  lang?: string | null
}

export async function sendResetPasswordEmail(payload: ResetPasswordEmailPayload) {
  const { recipientEmail, name, resetUrl } = payload
  const lang = detectLang(payload.lang)

  const html = buildResetPasswordEmail({ name, resetUrl, lang })

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: recipientEmail,
      subject: getResetPasswordSubject(lang),
      html,
    })

    if (error) {
      console.error('[sendResetPasswordEmail] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, emailId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sendResetPasswordEmail] Unexpected error:', msg)
    return { success: false, error: msg }
  }
}
