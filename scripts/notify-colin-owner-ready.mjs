/**
 * One-off: notify colin.leigh@pm.me that his account is now linked as
 * OWNER of "Kongjitsu" (see scripts/fix-colin-leigh-claim-kongjitsu.mjs,
 * which created the School + SchoolMember link).
 *
 * Usage: node scripts/notify-colin-owner-ready.mjs
 */
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)

const FROM = 'Martial <notifications@martialapp.com>'
const TO = 'colin.leigh@pm.me'
const APP_URL = env.NEXT_PUBLIC_APP_URL

const C = {
  background: '#F4F7FB', surface: '#FFFFFF', text: '#101828',
  secondary: '#667085', navy: '#0E3A7A', primary: '#0870E2', white: '#FFFFFF',
}

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.background};color:${C.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.background};">
    <tr><td align="center" style="padding:44px 16px 52px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">
        <tr><td style="background:${C.surface};border-radius:24px;padding:38px 34px;">
          <p style="margin:0 0 22px;color:${C.navy};font-size:17px;font-weight:800;">Martial</p>
          <h1 style="margin:0 0 14px;color:${C.text};font-size:22px;line-height:29px;font-weight:800;">Your Kongjitsu account is ready</h1>
          <p style="margin:0 0 14px;color:${C.secondary};font-size:15px;line-height:24px;">Hi Colin,</p>
          <p style="margin:0 0 24px;color:${C.secondary};font-size:15px;line-height:24px;">
            Your account is now set up as the owner of <strong style="color:${C.text};">Kongjitsu</strong> on Martial. You can log in and start managing your academy — classes, students, memberships and more — from your dashboard.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:12px;">
              <a href="${APP_URL}/dashboard" style="display:block;padding:14px 22px;color:${C.white};font-size:15px;font-weight:800;text-decoration:none;">Go to dashboard</a>
            </td></tr>
          </table>
          <p style="margin:26px 0 0;color:${C.secondary};font-size:14px;line-height:22px;">
            Any questions, just reply to this email or write to <a href="mailto:notifications@martialapp.com" style="color:${C.text};">notifications@martialapp.com</a>.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:20px 0 0;color:${C.secondary};font-size:12px;">© ${new Date().getFullYear()} Martial</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const resend = new Resend(env.RESEND_API_KEY)
const { data, error } = await resend.emails.send({
  from: FROM,
  to: TO,
  subject: 'Your Kongjitsu account is ready on Martial',
  html,
})

if (error) { console.error('Send failed:', error); process.exit(1) }
console.log('Sent. Resend id:', data?.id)
