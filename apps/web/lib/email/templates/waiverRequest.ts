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
  amber:   '#D97706',
  amberBg: '#FFFBEB',
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
    subject: w => `Action needed: sign "${w}" before your next class`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'A waiver needs your signature',
    body: (s, w) => `<strong>${s}</strong> has sent you the <strong>${w}</strong> waiver. You'll need to sign it before you can book or attend any class.`,
    cta: 'Review and sign',
    note: 'Signing takes less than a minute — the whole document is on the next page.',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: w => `Acción necesaria: firma "${w}" antes de tu próxima clase`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Tienes un waiver pendiente de firma',
    body: (s, w) => `<strong>${s}</strong> te ha enviado el waiver <strong>${w}</strong>. Debes firmarlo antes de poder reservar o asistir a cualquier clase.`,
    cta: 'Revisar y firmar',
    note: 'Firmar toma menos de un minuto — el documento completo está en la siguiente página.',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: w => `Ação necessária: assine "${w}" antes da sua próxima aula`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Tem um waiver pendente de assinatura',
    body: (s, w) => `<strong>${s}</strong> enviou-lhe o waiver <strong>${w}</strong>. Precisa de o assinar antes de poder reservar ou assistir a qualquer aula.`,
    cta: 'Rever e assinar',
    note: 'Assinar demora menos de um minuto — o documento completo está na página seguinte.',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: w => `Action requise : signez « ${w} » avant votre prochain cours`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Une décharge attend votre signature',
    body: (s, w) => `<strong>${s}</strong> vous a envoyé la décharge <strong>${w}</strong>. Vous devez la signer avant de pouvoir réserver ou suivre un cours.`,
    cta: 'Consulter et signer',
    note: 'La signature prend moins d\'une minute — le document complet est sur la page suivante.',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

export function getWaiverRequestSubject(waiverTitle: string, lang: Lang): string {
  return T[lang].subject(waiverTitle)
}

export function buildWaiverRequestEmail({
  studentName,
  schoolName,
  schoolCity,
  waiverTitle,
  signUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  waiverTitle: string
  signUrl: string
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
                  <a href="${signUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
                </td></tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr><td style="background:${C.amberBg};border-radius:10px;padding:14px 18px;border-left:3px solid ${C.amber};">
                  <p style="margin:0;font-size:13px;color:${C.amber};line-height:1.5;">✍️ ${t.note}</p>
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
