import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getResend, FROM } from '@/lib/email/resend'

const DEFAULT_ADMIN_EMAIL = 'admin@martial.app'

// POST /api/claim/request — Public endpoint. A visitor asks to claim ownership
// of a school listing; we email the superadmin so they can verify and send the
// real invitation via the existing /api/admin/schools/[id]/resend-invite flow.
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    schoolName?: string; contactName?: string; contactEmail?: string
    phone?: string; city?: string; message?: string
  }

  const schoolName = body.schoolName?.trim()
  const contactName = body.contactName?.trim()
  const contactEmail = body.contactEmail?.trim().toLowerCase()

  if (!schoolName) return NextResponse.json({ error: 'schoolName is required' }, { status: 400 })
  if (!contactName) return NextResponse.json({ error: 'contactName is required' }, { status: 400 })
  if (!contactEmail) return NextResponse.json({ error: 'contactEmail is required' }, { status: 400 })

  const phone = body.phone?.trim() || ''
  const city = body.city?.trim() || ''
  const message = body.message?.trim() || ''

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
  const adminEmail = settings?.superAdminEmail || DEFAULT_ADMIN_EMAIL

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      adminEmail,
    replyTo: contactEmail,
    subject: `School claim request: ${schoolName}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
        <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px">New school claim request</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6B7280;width:120px">School</td><td style="padding:8px 0;font-weight:600;color:#111827">${schoolName}</td></tr>
          ${city ? `<tr><td style="padding:8px 0;color:#6B7280">City</td><td style="padding:8px 0;color:#111827">${city}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6B7280">Contact</td><td style="padding:8px 0;color:#111827">${contactName}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280">Email</td><td style="padding:8px 0;color:#111827">${contactEmail}</td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6B7280">Phone</td><td style="padding:8px 0;color:#111827">${phone}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;color:#6B7280;vertical-align:top">Message</td><td style="padding:8px 0;color:#111827;white-space:pre-wrap">${message}</td></tr>` : ''}
        </table>
        <p style="font-size:13px;color:#6B7280;margin-top:24px">
          Verify ownership, then send the claim invitation from the school's row in
          <strong>Admin → All Schools</strong>.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[claim request] admin email failed:', error)
    return NextResponse.json({ error: 'Failed to send request' }, { status: 502 })
  }

  // Auto-reply to the submitter (fire-and-forget)
  getResend().emails.send({
    from:    FROM,
    to:      contactEmail,
    subject: `We received your claim request for ${schoolName}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
        <p style="font-size:16px;color:#111827;margin:0 0 12px">Hi ${contactName},</p>
        <p style="font-size:14px;color:#374151;margin:0 0 12px">
          Thanks for requesting to claim <strong>${schoolName}</strong> on Martial.
          Our team will verify your ownership and email you a claim link shortly.
        </p>
        <p style="font-size:12px;color:#9CA3AF;margin:24px 0 0">— The Martial team</p>
      </div>
    `,
  }).catch(err => console.error('[claim request] auto-reply failed:', err))

  return NextResponse.json({ ok: true })
}
