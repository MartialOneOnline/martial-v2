import { getResend, FROM } from './resend'
import { buildConfirmEmail, getConfirmSubject } from './templates/confirmEmail'
import { detectLang } from './templates/inviteStudent'

export interface ConfirmEmailPayload {
  recipientEmail: string
  name?: string | null
  confirmUrl: string
  lang?: string | null
}

export async function sendConfirmEmail(payload: ConfirmEmailPayload) {
  const { recipientEmail, name, confirmUrl } = payload
  const lang = detectLang(payload.lang)

  const html = buildConfirmEmail({ name, confirmUrl, lang })

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: recipientEmail,
      subject: getConfirmSubject(lang),
      html,
    })

    if (error) {
      console.error('[sendConfirmEmail] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, emailId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sendConfirmEmail] Unexpected error:', msg)
    return { success: false, error: msg }
  }
}
