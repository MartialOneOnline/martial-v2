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

const C = {
  bg: '#F6F7F8',
  card: '#FFFFFF',
  text: '#111827',
  body: '#39424E',
  muted: '#66717D',
  soft: '#F8FAFC',
  border: '#E5EAF0',
  primary: '#006197',
  navy: '#0D1B2A',
  white: '#FFFFFF',
}

export function buildInviteSchoolEmail(props: Props): string {
  const { schoolName, inviteUrl, city, country, address, website, googleRating, googleReviews } = props
  const location = [city, country].filter(Boolean).join(', ')
  const year = new Date().getFullYear()
  const profileRows = [
    googleRating ? dataRow('Google rating', `${googleRating}${googleReviews ? ` · ${googleReviews} reviews` : ''}`) : null,
    address || location ? dataRow('Location', address || location) : null,
    website
      ? dataRow(
          'Website',
          `<a href="${esc(website)}" style="color:${C.primary};text-decoration:none;font-weight:700;">${esc(formatWebsite(website))}</a>`,
          false,
        )
      : null,
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
<body style="margin:0;padding:0;background:${C.bg};color:${C.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.bg};">
    <tr>
      <td align="center" style="padding:42px 16px 52px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;">
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:24px;padding:30px 34px 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 30px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="vertical-align:middle;">
                          ${brand()}
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;border:1px solid #DDE5EC;border-radius:999px;padding:7px 11px;color:#526171;font-size:12px;line-height:14px;font-weight:700;">
                            Directory profile
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 28px;">
                    <h1 style="margin:0;color:${C.text};font-size:30px;line-height:37px;font-weight:800;letter-spacing:0;">
                      ${esc(schoolName)} is now on Martial App
                    </h1>
                    <p style="margin:12px 0 0;color:#5B6470;font-size:16px;line-height:25px;">
                      Your academy profile is ready for students searching nearby. Claim it to keep the details accurate and start managing your presence.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.navy};border-radius:18px;">
                      <tr>
                        <td style="padding:22px 22px 20px;">
                          <p style="margin:0 0 8px;color:${C.white};font-size:20px;line-height:27px;font-weight:800;">
                            ${esc(schoolName)}
                          </p>
                          ${location ? `<p style="margin:0 0 18px;color:#AAB7C4;font-size:14px;line-height:21px;">${esc(location)} · Visible, not yet claimed</p>` : `<p style="margin:0 0 18px;color:#AAB7C4;font-size:14px;line-height:21px;">Visible, not yet claimed</p>`}
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#13283E;border-radius:14px;">
                            <tr>
                              <td style="padding:16px 18px;">
                                ${profileRows || dataRow('Status', 'Profile ready to claim')}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 14px;color:${C.body};font-size:16px;line-height:25px;">
                      Hi ${esc(schoolName)} team,
                    </p>
                    <p style="margin:0;color:${C.body};font-size:16px;line-height:25px;">
                      We added your academy to Martial App, a directory built for martial artists looking for trusted BJJ, MMA and martial arts schools.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background:${C.soft};border:1px solid #E7EDF3;border-radius:16px;padding:20px 22px;">
                    <h2 style="margin:0 0 8px;color:${C.text};font-size:18px;line-height:24px;font-weight:800;">
                      What claiming unlocks
                    </h2>
                    <p style="margin:0;color:#4D5662;font-size:15px;line-height:24px;">
                      Update your academy details, manage classes and make sure students see the right information before they contact you.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="${C.primary}" style="background:${C.primary};border-radius:14px;">
                          <a href="${esc(inviteUrl)}" style="display:block;padding:16px 18px;color:${C.white};font-size:15px;line-height:20px;font-weight:800;text-decoration:none;">
                            Claim your profile
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:13px 0 0;color:#8A95A3;font-size:12px;line-height:18px;text-align:center;">
                      Free to claim. No credit card required.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${C.border};">
                      <tr>
                        <td style="padding:24px 0 0;">
                          <p style="margin:0 0 3px;color:${C.text};font-size:15px;line-height:22px;font-weight:800;">
                            Have questions?
                          </p>
                          <p style="margin:0;color:#5B6470;font-size:14px;line-height:22px;">
                            Reply to this email or write to
                            <a href="mailto:notifications@martialapp.com" style="color:${C.primary};text-decoration:underline;">notifications@martialapp.com</a>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:34px 0 0;">
                    ${mark()}
                    <p style="margin:12px 0 0;color:#7A8490;font-size:13px;line-height:20px;">
                      Martial App<br>
                      The martial arts directory for academies and students
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 18px 0;color:#7A8490;font-size:13px;line-height:20px;">
              <p style="margin:0;">
                You received this because ${esc(schoolName)} appeared in our martial arts directory.
                <br>
                <a href="${esc(inviteUrl)}?decline=1" style="color:#66717D;text-decoration:underline;">Remove my school</a>
              </p>
              <p style="margin:14px 0 0;color:#B3BBC4;">© ${year} Martial App</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function brand() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle;">${mark()}</td>
      <td style="padding-left:11px;color:${C.navy};font-size:17px;line-height:21px;font-weight:800;vertical-align:middle;">Martial App</td>
    </tr>
  </table>`
}

function mark() {
  return `<span style="display:inline-block;width:36px;height:36px;background:${C.primary};border-radius:10px;color:${C.white};font-size:18px;line-height:36px;font-weight:800;text-align:center;">M</span>`
}

function dataRow(label: string, value: string | null | undefined, escapeValue = true) {
  if (!value) return ''
  const safeValue = escapeValue ? esc(value) : value
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 0 7px;color:#AAB7C4;font-size:12px;line-height:17px;width:118px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:0 0 7px;color:${C.white};font-size:13px;line-height:18px;font-weight:700;vertical-align:top;">${safeValue}</td>
    </tr>
  </table>`
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
