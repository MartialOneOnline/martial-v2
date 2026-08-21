import { detectLang } from './inviteStudent'

type Lang = 'en' | 'es' | 'pt' | 'fr'

const C = {
  primary: '#0071E3',
  navy:    '#0E3A7A',
  cyan:    '#7DE7EC',
  bg:      '#F4F6F9',
  card:    '#FFFFFF',
  text:    '#111827',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  green:   '#16A34A',
  greenBg: '#F0FDF4',
}

const T: Record<Lang, {
  subject: (waiver: string) => string
  greeting: (name?: string) => string
  headline: string
  body: (school: string, waiver: string) => string
  cta: string
  note: string
  footer: string
}> = {
  en: {
    subject: w => `Your signature on "${w}" is confirmed`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Waiver signed',
    body: (s, w) => `This confirms your signature on the <strong>${w}</strong> waiver for <strong>${s}</strong>. A signed copy is available from your account any time.`,
    cta: 'View my waivers',
    note: 'Your signature, the exact text you agreed to, and the date/time are kept on file as your signed copy.',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: w => `Tu firma en "${w}" está confirmada`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Waiver firmado',
    body: (s, w) => `Confirmamos tu firma en el waiver <strong>${w}</strong> de <strong>${s}</strong>. Tienes la copia firmada disponible en tu cuenta cuando quieras.`,
    cta: 'Ver mis waivers',
    note: 'Tu firma, el texto exacto que aceptaste y la fecha/hora quedan guardados como tu copia firmada.',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: w => `A sua assinatura em "${w}" está confirmada`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Waiver assinado',
    body: (s, w) => `Confirmamos a sua assinatura no waiver <strong>${w}</strong> de <strong>${s}</strong>. Tem a cópia assinada disponível na sua conta a qualquer momento.`,
    cta: 'Ver os meus waivers',
    note: 'A sua assinatura, o texto exato que aceitou e a data/hora ficam guardados como a sua cópia assinada.',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: w => `Votre signature sur « ${w} » est confirmée`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Décharge signée',
    body: (s, w) => `Nous confirmons votre signature sur la décharge <strong>${w}</strong> pour <strong>${s}</strong>. La copie signée est disponible à tout moment depuis votre compte.`,
    cta: 'Voir mes décharges',
    note: 'Votre signature, le texte exact accepté et la date/heure sont conservés comme votre copie signée.',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

export function getWaiverSignedSubject(waiverTitle: string, lang: Lang): string {
  return T[lang].subject(waiverTitle)
}

export function buildWaiverSignedEmail({
  studentName,
  schoolName,
  schoolCity,
  waiverTitle,
  waiversUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  waiverTitle: string
  waiversUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(waiverTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:${C.navy};border-radius:12px;padding:10px 20px;">
              <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">MARTIAL</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${C.card};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:linear-gradient(135deg,${C.primary} 0%,${C.navy} 100%);padding:32px 40px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.cyan};text-transform:uppercase;letter-spacing:0.08em;">
                ${schoolCity ? `${schoolCity} · ` : ''}Martial
              </p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${t.headline}</p>
            </td>
          </tr></table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${t.greeting(studentName ?? undefined)}</p>
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body(schoolName, waiverTitle)}</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr><td align="center" style="background:${C.primary};border-radius:10px;">
                  <a href="${waiversUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
                </td></tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr><td style="background:${C.greenBg};border-radius:10px;padding:14px 18px;border-left:3px solid ${C.green};">
                  <p style="margin:0;font-size:13px;color:${C.green};line-height:1.5;">✅ ${t.note}</p>
                </td></tr>
              </table>

            </td>
          </tr></table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">${t.footer}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color:#9CA3AF;">martial.one</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
