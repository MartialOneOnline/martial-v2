import { getResend, FROM } from './resend'
import { buildEmailChangeCodeEmail, getEmailChangeCodeSubject } from './templates/emailChangeCode'
import { detectLang } from './templates/inviteStudent'

export async function sendEmailChangeCode(payload: { recipientEmail: string; code: string; lang?: string | null }) {
  const lang = detectLang(payload.lang)
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: payload.recipientEmail,
      subject: getEmailChangeCodeSubject(lang),
      html: buildEmailChangeCodeEmail({ code: payload.code, lang }),
    })
    if (error) {
      console.error('[sendEmailChangeCode] Resend error:', error)
      return { success: false as const, error: error.message }
    }
    return { success: true as const, emailId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sendEmailChangeCode] Unexpected error:', msg)
    return { success: false as const, error: msg }
  }
}
