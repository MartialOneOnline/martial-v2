import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { notifyNewLead } from '@/lib/notifications/create'
import { getResend, FROM } from '@/lib/email/resend'

// POST /api/public/schools/[slug]/lead
// Public endpoint — no auth required. Creates a LEAD from the school's public join page.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, name: true, city: true, email: true },
  })
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const body = await req.json() as {
    name: string; email?: string; phone?: string; message?: string; interestedIn?: string
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Prevent duplicate leads from the same email in the same school
  if (body.email?.trim()) {
    const dup = await prisma.lead.findFirst({
      where: { schoolId: school.id, email: body.email.trim().toLowerCase(), status: { not: 'LOST' } },
    })
    if (dup) return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  const lead = await prisma.lead.create({
    data: {
      schoolId:     school.id,
      name:         body.name.trim(),
      email:        body.email?.trim().toLowerCase() || null,
      phone:        body.phone?.trim() || null,
      source:       'WEBSITE',
      status:       'NEW',
      message:      body.message?.trim() || null,
      interestedIn: body.interestedIn?.trim() || null,
    },
  })

  // Notify school admins
  notifyNewLead(school.id, lead.name)

  // Email the school (fire-and-forget)
  if (school.email) {
    getResend().emails.send({
      from:    FROM,
      to:      school.email,
      subject: `New lead: ${lead.name} — ${school.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
          <p style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px">New lead from your school page</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6B7280;width:100px">Name</td><td style="padding:8px 0;font-weight:600;color:#111827">${lead.name}</td></tr>
            ${lead.email ? `<tr><td style="padding:8px 0;color:#6B7280">Email</td><td style="padding:8px 0;color:#111827">${lead.email}</td></tr>` : ''}
            ${lead.phone ? `<tr><td style="padding:8px 0;color:#6B7280">Phone</td><td style="padding:8px 0;color:#111827">${lead.phone}</td></tr>` : ''}
            ${lead.interestedIn ? `<tr><td style="padding:8px 0;color:#6B7280">Interested in</td><td style="padding:8px 0;color:#111827">${lead.interestedIn}</td></tr>` : ''}
            ${lead.message ? `<tr><td style="padding:8px 0;color:#6B7280;vertical-align:top">Message</td><td style="padding:8px 0;color:#111827;white-space:pre-wrap">${lead.message}</td></tr>` : ''}
          </table>
          <div style="margin-top:24px">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/school/leads"
              style="background:#0870E2;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
              View in Dashboard →
            </a>
          </div>
        </div>
      `,
    }).catch(err => console.error('[public lead] school email failed:', err))
  }

  // Auto-reply to the lead (fire-and-forget)
  if (lead.email) {
    getResend().emails.send({
      from:    FROM,
      to:      lead.email,
      subject: `Thanks for your interest in ${school.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
          <p style="font-size:16px;color:#111827;margin:0 0 12px">Hi ${lead.name},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 12px">
            Thanks for reaching out to <strong>${school.name}</strong>${school.city ? ` in ${school.city}` : ''}.
            We've received your message and will be in touch soon.
          </p>
          <p style="font-size:12px;color:#9CA3AF;margin:24px 0 0">— ${school.name} team</p>
        </div>
      `,
    }).catch(err => console.error('[public lead] auto-reply failed:', err))
  }

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 })
}
