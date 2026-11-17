// Martial brand colors — kept in sync with the other templates in this folder
const C = {
  primary: '#0071E3',
  navy:    '#0E3A7A',
  cyan:    '#7DE7EC',
  bg:      '#F4F6F9',
  card:    '#FFFFFF',
  text:    '#111827',
  muted:   '#6B7280',
  border:  '#E5E7EB',
}

export type CampaignLang = 'en' | 'es' | 'pt' | 'fr'

export type CampaignTokens = {
  nombre: string
  escuela: string
  cinturon?: string
  ciudad?: string
}

const FOOTER: Record<CampaignLang, (school: string) => string> = {
  en: s => `Sent by ${s} via Martial.`,
  es: s => `Enviado por ${s} a través de Martial.`,
  pt: s => `Enviado por ${s} via Martial.`,
  fr: s => `Envoyé par ${s} via Martial.`,
}

export function toCampaignLang(lang?: string | null): CampaignLang {
  return lang === 'es' || lang === 'pt' || lang === 'fr' ? lang : 'en'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Replaces {{token}} placeholders with recipient-specific values before the
// message is escaped and wrapped in the branded envelope — this must run
// first so the substituted values still get HTML-escaped downstream.
export function renderCampaignTokens(raw: string, tokens: CampaignTokens): string {
  return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = tokens[key.toLowerCase() as keyof CampaignTokens]
    return value ?? ''
  })
}

// Display name shown by the mail client ("Roger Gracie Málaga") on the
// shared, domain-verified sending address. Quoted per RFC 5322 so names with
// commas, dots or parentheses don't break the header; quotes/backslashes and
// line breaks are stripped rather than escaped (header injection safety).
export function campaignFrom(schoolName: string, address = 'notifications@martialapp.com'): string {
  const clean = schoolName.replace(/["\\\r\n]/g, '').trim()
  return clean ? `"${clean}" <${address}>` : `Martial <${address}>`
}

// Only absolute https raster images render reliably across clients — Gmail
// drops SVG and http/relative URLs show as broken images.
export function usableEmailLogo(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!/^https:\/\//i.test(trimmed)) return null
  if (/\.svg(\?|#|$)/i.test(trimmed)) return null
  return trimmed
}

// A campaign email: the body is entirely author-written (the presets carry
// their own "Hola {{nombre}}," greeting), so unlike directMessage this
// envelope adds no greeting of its own — that produced a duplicated,
// always-English "Hi X," line. Branding is the school's, not Martial's.
export function buildCampaignEmail({
  schoolName, schoolLogoUrl, message, language,
}: {
  schoolName: string
  schoolLogoUrl?: string | null
  message: string
  language?: string | null
}): string {
  const lang = toCampaignLang(language)
  const bodyHtml = escapeHtml(message).replace(/\n/g, '<br />')
  const logo = usableEmailLogo(schoolLogoUrl)

  const header = logo
    ? `<img src="${escapeHtml(logo)}" width="64" height="64" alt="${escapeHtml(schoolName)}" style="display: block; border: 0; width: 64px; height: 64px; border-radius: 16px; object-fit: cover;" />`
    : `<table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: ${C.navy}; border-radius: 12px; padding: 10px 20px;">
                    <span style="font-size: 16px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.2px;">${escapeHtml(schoolName)}</span>
                  </td>
                </tr>
              </table>`

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${C.bg}; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- School logo -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              ${header}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background: ${C.card}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${C.primary} 0%, ${C.navy} 100%); padding: 32px 40px; text-align: left;">
                    <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${C.cyan}; text-transform: uppercase; letter-spacing: 0.08em;">
                      ${escapeHtml(schoolName)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 36px 40px;">
                    <p style="margin: 0; font-size: 14px; color: ${C.text}; line-height: 1.7;">${bodyHtml}</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">${escapeHtml(FOOTER[lang](schoolName))}</p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #9CA3AF;">
                © ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color: #9CA3AF;">martial.one</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

// Plain-text alternative sent alongside the HTML (better deliverability and
// inbox preview). Same content as the HTML body — no automatic greeting.
export function buildCampaignText({
  schoolName, message, language,
}: {
  schoolName: string
  message: string
  language?: string | null
}): string {
  const lang = toCampaignLang(language)
  return `${message.trim()}\n\n—\n${FOOTER[lang](schoolName)}\nmartial.one`
}
