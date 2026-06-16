interface Props {
  schoolName: string
  inviteUrl: string
  city?: string | null
  country?: string | null
  address?: string | null
  website?: string | null
  googleRating?: number | null
  googleReviews?: number | null
  logoUrl?: string | null
  bannerUrl?: string | null
}

const C = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E5EAF0',
  text: '#101828',
  secondary: '#667085',
  muted: '#98A2B3',
  navy: '#0E3A7A',
  primary: '#0870E2',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  pendingBg: '#FEF9C3',
  pendingText: '#A16207',
  pendingBorder: '#FDE68A',
  white: '#FFFFFF',
}

export function buildInviteSchoolEmail(props: Props): string {
  const { schoolName, inviteUrl, city, country, address, website, googleRating, googleReviews, logoUrl, bannerUrl } = props
  const location = [city, country].filter(Boolean).join(', ')
  const year = new Date().getFullYear()

  const details = [
    city ? detailRow('City', city) : null,
    country ? detailRow('Country', country) : null,
    detailRow('Claimed', statusPill(), false),
    address ? detailRow('Address', address) : null,
    location ? detailRow('Location', location) : null,
    website
      ? detailRow(
          'Website',
          `<a href="${esc(website)}" style="color:${C.primary};text-decoration:underline;">${esc(formatWebsite(website))}</a>`,
          false,
        )
      : null,
    googleRating ? detailRow('Google rating', `${googleRating}${googleReviews ? ` · ${googleReviews} reviews` : ''}`) : null,
  ]
    .filter(Boolean)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(schoolName)} — your academy profile is ready on Martial App</title>
</head>
<body style="margin:0;padding:0;background:${C.background};color:${C.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.background};">
    <tr>
      <td align="center" style="padding:44px 16px 52px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;">
          <tr>
            <td style="background:${C.surface};border-radius:30px;padding:38px 34px 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:0 0 26px;">
                    ${logo(logoUrl, 46)}
                    <p style="margin:10px 0 0;color:${C.navy};font-size:18px;line-height:22px;font-weight:800;">
                      Martial App
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <h1 style="margin:0;color:${C.text};font-size:28px;line-height:35px;font-weight:800;letter-spacing:0;">
                      Your academy profile is ready
                    </h1>
                    <p style="margin:10px 0 0;color:${C.secondary};font-size:15px;line-height:23px;">
                      ${esc(schoolName)} is now visible on Martial App.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 28px;">
                    ${banner(bannerUrl, schoolName)}
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 30px;">
                    <h2 style="margin:0;color:${C.text};font-size:22px;line-height:28px;font-weight:800;">
                      ${esc(schoolName)}
                    </h2>
                    ${location ? `<p style="margin:8px 0 0;color:${C.secondary};font-size:14px;line-height:21px;">${esc(location)}</p>` : ''}
                    <p style="margin:12px 0 0;">${statusPill()}</p>
                  </td>
                </tr>

                ${divider()}

                <tr>
                  <td style="padding:28px 0;">
                    <p style="margin:0 0 14px;color:${C.secondary};font-size:16px;line-height:25px;">
                      Hi ${esc(schoolName)} team,
                    </p>
                    <p style="margin:0;color:${C.secondary};font-size:16px;line-height:25px;">
                      We added your academy to Martial App, a directory built for martial artists looking for trusted BJJ, MMA and martial arts schools near them.
                    </p>
                  </td>
                </tr>

                ${divider()}

                <tr>
                  <td style="padding:28px 0;">
                    <h3 style="margin:0 0 18px;color:${C.text};font-size:20px;line-height:26px;font-weight:800;">
                      Profile details
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      ${details || detailRow('Status', 'Profile ready to claim')}
                    </table>
                  </td>
                </tr>

                ${divider()}

                <tr>
                  <td style="padding:28px 0 0;">
                    <h3 style="margin:0 0 8px;color:${C.text};font-size:20px;line-height:26px;font-weight:800;">
                      Claim your profile
                    </h3>
                    <p style="margin:0 0 24px;color:${C.secondary};font-size:15px;line-height:24px;">
                      Keep your academy details accurate, manage classes and help students contact the right team.
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:12px;">
                          <a href="${esc(inviteUrl)}" style="display:block;padding:16px 18px;color:${C.white};font-size:15px;line-height:20px;font-weight:800;text-decoration:none;">
                            Claim your profile
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:13px 0 0;color:${C.muted};font-size:12px;line-height:18px;text-align:center;">
                      Free to claim. No credit card required.
                    </p>
                  </td>
                </tr>

                ${divider('34px', '0')}

                <tr>
                  <td style="padding:24px 0 0;">
                    <p style="margin:0 0 3px;color:${C.text};font-size:15px;line-height:22px;font-weight:800;">
                      Have questions?
                    </p>
                    <p style="margin:0;color:${C.secondary};font-size:14px;line-height:22px;">
                      Reply to this email or write to
                      <a href="mailto:notifications@martialapp.com" style="color:${C.text};text-decoration:underline;">notifications@martialapp.com</a>.
                    </p>
                  </td>
                </tr>

                ${divider('34px', '0')}

                <tr>
                  <td align="center" style="padding:28px 0 0;">
                    ${logo(logoUrl, 32)}
                    <p style="margin:12px 0 0;color:${C.secondary};font-size:13px;line-height:20px;">
                      Martial App<br>
                      The martial arts directory for academies and students
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 18px 0;color:${C.secondary};font-size:13px;line-height:20px;">
              <p style="margin:0;">
                You received this because ${esc(schoolName)} appeared in our martial arts directory.
                <br>
                <a href="${esc(inviteUrl)}?decline=1" style="color:${C.secondary};text-decoration:underline;">Remove my school</a>
              </p>
              <p style="margin:14px 0 0;color:${C.muted};">© ${year} Martial App</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function banner(bannerUrl: string | null | undefined, schoolName: string) {
  if (bannerUrl) {
    return `<img src="${esc(bannerUrl)}" width="572" alt="${esc(schoolName)}" style="display:block;width:100%;max-width:572px;height:auto;border:0;border-radius:18px;">`
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.primarySoft};border:1px solid ${C.primaryBorder};border-radius:18px;">
    <tr>
      <td align="center" style="padding:42px 24px;">
        <p style="margin:0;color:${C.navy};font-size:16px;line-height:24px;font-weight:800;">${esc(schoolName)}</p>
        <p style="margin:6px 0 0;color:${C.secondary};font-size:13px;line-height:20px;">Academy profile preview</p>
      </td>
    </tr>
  </table>`
}

function divider(top = '0', bottom = '0') {
  return `<tr><td style="padding:${top} 0 ${bottom};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="border-top:1px solid ${C.border};font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`
}

function detailRow(label: string, value: string | null | undefined, escapeValue = true) {
  if (!value) return ''
  const safeValue = escapeValue ? esc(value) : value

  return `<tr>
    <td style="padding:0 18px 13px 0;color:${C.secondary};font-size:15px;line-height:22px;vertical-align:top;">${esc(label)}</td>
    <td align="right" style="padding:0 0 13px;color:${C.text};font-size:15px;line-height:22px;font-weight:700;vertical-align:top;">${safeValue}</td>
  </tr>`
}

function logo(logoUrl?: string | null, size = 40) {
  if (logoUrl) {
    return `<img src="${esc(logoUrl)}" width="${size}" height="${size}" alt="Martial App" style="display:block;border:0;width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.28)}px;">`
  }

  return `<span style="display:inline-block;width:${size}px;height:${size}px;background:${C.primary};border-radius:${Math.round(size * 0.28)}px;color:${C.white};font-size:${Math.round(size * 0.5)}px;line-height:${size}px;font-weight:800;text-align:center;">M</span>`
}

function statusPill() {
  return `<span style="display:inline-block;background:${C.pendingBg};border:1px solid ${C.pendingBorder};border-radius:999px;padding:7px 11px;color:${C.pendingText};font-size:12px;line-height:14px;font-weight:800;">Not claimed</span>`
}

function esc(str: string | number) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatWebsite(website: string) {
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
