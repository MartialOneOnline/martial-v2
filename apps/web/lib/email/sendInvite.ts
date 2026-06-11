import { resend, FROM, APP_URL } from './resend'
import { buildInviteSchoolEmail } from './templates/inviteSchool'

export interface InvitePayload {
  invitationId: string
  schoolName: string
  recipientEmail: string
  city?: string | null
  country?: string | null
  address?: string | null
  website?: string | null
  googleRating?: number | null
  googleReviews?: number | null
}

export async function sendInviteEmail(payload: InvitePayload) {
  const { invitationId, schoolName, recipientEmail } = payload
  const inviteUrl = `${APP_URL}/claim/${invitationId}`

  const html = buildInviteSchoolEmail({ ...payload, inviteUrl })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `${schoolName} — your profile is live on Martial App`,
      html,
    })

    if (error) {
      console.error('[sendInviteEmail] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, emailId: data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sendInviteEmail] Unexpected error:', msg)
    return { success: false, error: msg }
  }
}
