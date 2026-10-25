import { prisma } from '@/lib/db'
import { getResend, FROM } from '@/lib/email/resend'

const DEFAULT_ADMIN_EMAIL = 'support@martialapp.com'

export interface WebhookFailureAlert {
  provider: 'Stripe'
  eventId: string
  eventType: string
  error: string
  // Human-readable context pulled from the event payload (customer, amount...).
  details?: Record<string, string | null | undefined>
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Emails the platform super admin when a payment webhook delivery fails.
// A failed delivery means real money may have been captured with no
// Membership/Transaction recorded (the 2026-09-17 and 2026-10-23 incidents sat
// unnoticed for days because nothing surfaced FAILED StripeWebhookEvent rows).
//
// Never throws: it runs inside the webhook's error path, where a failing alert
// must not mask the original error or change the HTTP response to the provider.
export async function alertWebhookFailure(alert: WebhookFailureAlert): Promise<void> {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
    const to = settings?.superAdminEmail || DEFAULT_ADMIN_EMAIL

    const eventUrl = `https://dashboard.stripe.com/events/${encodeURIComponent(alert.eventId)}`
    const detailRows = Object.entries(alert.details ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6B7280;width:130px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;color:#111827">${escapeHtml(String(v))}</td></tr>`)
      .join('')

    const { error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: `[Martial] ${alert.provider} webhook failed: ${alert.eventType}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
          <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px">${alert.provider} webhook failed</p>
          <p style="font-size:14px;color:#374151;margin:0 0 16px">A payment event could not be processed. Money may have been captured without a membership or transaction being recorded.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#6B7280;width:130px">Event</td><td style="padding:6px 0;color:#111827"><a href="${eventUrl}">${escapeHtml(alert.eventId)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6B7280">Type</td><td style="padding:6px 0;color:#111827">${escapeHtml(alert.eventType)}</td></tr>
            ${detailRows}
            <tr><td style="padding:6px 0;color:#6B7280;vertical-align:top">Error</td><td style="padding:6px 0;color:#B91C1C;font-family:monospace;font-size:13px">${escapeHtml(alert.error)}</td></tr>
          </table>
          <p style="font-size:13px;color:#6B7280;margin:16px 0 0">Stripe retries failed deliveries for about 3 days; this alert is sent once, on the first failure. The row stays FAILED in stripe_webhook_events until a retry succeeds — if it keeps failing, reconcile by hand.</p>
        </div>`,
    })
    if (error) console.error('[webhook alert] Resend error:', error)
  } catch (err) {
    console.error('[webhook alert] failed to send alert:', err instanceof Error ? err.message : err)
  }
}
