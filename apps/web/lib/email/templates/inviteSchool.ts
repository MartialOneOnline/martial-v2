interface Props {
  schoolName: string
  inviteUrl: string
  city?: string | null
  country?: string | null
  address?: string | null
  website?: string | null
  googleRating?: number | null
  googleReviews?: number | null
}

export function buildInviteSchoolEmail(props: Props): string {
  const { schoolName, inviteUrl, city, country, address, website, googleRating, googleReviews } = props
  const location = [city, country].filter(Boolean).join(', ')
  const year = new Date().getFullYear()

  const rows = [
    googleRating
      ? row('⭐', `${googleRating} on Google${googleReviews ? ` · ${googleReviews} reviews` : ''}`)
      : null,
    (address || location)
      ? row('📍', address || location || '')
      : null,
    website
      ? row('🌐', `<a href="${esc(website)}" style="color:#006197;text-decoration:none;">${esc(website.replace(/^https?:\/\//, ''))}</a>`)
      : null,
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(schoolName)} — your profile is live on Martial App</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

  <!-- Logo -->
  <div style="text-align:center;margin-bottom:20px;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:#006197;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;">
          <span style="color:#fff;font-weight:800;font-size:18px;line-height:36px;">M</span>
        </td>
        <td style="padding-left:10px;vertical-align:middle;">
          <span style="font-size:17px;font-weight:700;color:#0D1B2A;letter-spacing:-0.3px;">Martial App</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Card -->
  <div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #E5E7EB;">

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#0D1B2A 0%,#006197 100%);padding:48px 40px 40px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:100px;padding:6px 16px;margin-bottom:20px;">
        <span style="color:#fff;font-size:13px;font-weight:600;">🥋 Your profile is live</span>
      </div>
      <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;line-height:1.2;">
        ${esc(schoolName)}
      </h1>
      ${location ? `<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">📍 ${esc(location)}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="font-size:16px;color:#111827;margin:0 0 14px;font-weight:500;">Hi ${esc(schoolName)} team,</p>
      <p style="font-size:15px;color:#4B5563;line-height:1.65;margin:0 0 16px;">
        We've added <strong>${esc(schoolName)}</strong> to <strong>Martial App</strong> — the directory where martial artists around the world search for BJJ, MMA and martial arts academies.
      </p>
      <p style="font-size:15px;color:#4B5563;line-height:1.65;margin:0 0 20px;">
        Here's what your profile looks like right now:
      </p>

      <!-- Profile card -->
      <div style="background:#F8F9FB;border:1px solid #E5E7EB;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:16px;font-weight:700;color:#0D1B2A;margin:0 0 14px;">${esc(schoolName)}</p>
        ${rows}
        <div style="height:1px;background:#E5E7EB;margin:14px 0;"></div>
        <p style="font-size:13px;color:#6B7280;margin:0;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#F59E0B;margin-right:6px;vertical-align:middle;"></span>
          Profile visible · not yet claimed
        </p>
      </div>

      <p style="font-size:15px;color:#4B5563;line-height:1.65;margin:0 0 16px;">
        Your profile is <strong>already visible</strong> to martial artists searching nearby — but it's not claimed yet.
      </p>
      <p style="font-size:15px;color:#4B5563;line-height:1.65;margin:0 0 28px;">
        Claim it to manage your classes, accept memberships, and reach students worldwide.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${esc(inviteUrl)}" style="display:inline-block;background:#006197;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:14px;letter-spacing:-0.2px;">
          → Claim your profile
        </a>
      </div>
      <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:0;">Free · No credit card · No commitment</p>
    </div>
  </div>

  <!-- Support -->
  <div style="height:1px;background:#E5E7EB;margin:28px 0;"></div>
  <div style="padding:0 4px;">
    <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 6px;">Have questions?</p>
    <p style="font-size:14px;color:#6B7280;margin:0;line-height:1.6;">
      Reply to this email or write to
      <a href="mailto:notifications@martialapp.com" style="color:#006197;text-decoration:underline;">notifications@martialapp.com</a>.
    </p>
  </div>
  <div style="height:1px;background:#E5E7EB;margin:28px 0;"></div>

  <!-- Footer -->
  <div style="text-align:center;">
    <div style="background:#006197;width:36px;height:36px;border-radius:10px;display:inline-block;line-height:36px;text-align:center;margin-bottom:12px;">
      <span style="color:#fff;font-weight:800;font-size:18px;">M</span>
    </div>
    <p style="font-size:13px;color:#6B7280;line-height:1.7;margin:0 0 10px;">
      The Martial App Team<br/>notifications@martialapp.com
    </p>
    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;">
      You received this because ${esc(schoolName)} appeared in our martial arts directory.<br/>
      <a href="${esc(inviteUrl)}?decline=1" style="color:#9CA3AF;text-decoration:underline;">Remove my school</a>
    </p>
    <p style="font-size:11px;color:#D1D5DB;margin:16px 0 0;">© ${year} Martial App</p>
  </div>

</div>
</body>
</html>`
}

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function row(icon: string, content: string) {
  return `<p style="font-size:14px;color:#4B5563;margin:0 0 8px;line-height:1.5;">${icon}&nbsp;&nbsp;${content}</p>`
}
