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
  red:     '#DC2626',
  redBg:   '#FEF2F2',
}

const T: Record<Lang, {
  subject: (className: string) => string
  greeting: (name?: string) => string
  headline: string
  body: (className: string, school: string) => string
  details: { label: string; key: 'class' | 'date' }[]
  reasonLabel: string
  cta: string
  footer: string
}> = {
  en: {
    subject: c => `${c} has been cancelled`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Your class has been cancelled',
    body: (c, s) => `Your booking for <strong>${c}</strong> at <strong>${s}</strong> has been cancelled by the school.`,
    details: [
      { label: 'Class', key: 'class' },
      { label: 'Date & time', key: 'date' },
    ],
    reasonLabel: 'Reason',
    cta: 'View my classes',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: c => `${c} ha sido cancelada`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Tu clase ha sido cancelada',
    body: (c, s) => `Tu reserva para <strong>${c}</strong> en <strong>${s}</strong> ha sido cancelada por la escuela.`,
    details: [
      { label: 'Clase', key: 'class' },
      { label: 'Fecha y hora', key: 'date' },
    ],
    reasonLabel: 'Motivo',
    cta: 'Ver mis clases',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: c => `${c} foi cancelada`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'A sua aula foi cancelada',
    body: (c, s) => `A sua reserva para <strong>${c}</strong> em <strong>${s}</strong> foi cancelada pela escola.`,
    details: [
      { label: 'Aula', key: 'class' },
      { label: 'Data e hora', key: 'date' },
    ],
    reasonLabel: 'Motivo',
    cta: 'Ver as minhas aulas',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: c => `${c} a été annulé`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Votre cours a été annulé',
    body: (c, s) => `Votre réservation pour <strong>${c}</strong> chez <strong>${s}</strong> a été annulée par l'école.`,
    details: [
      { label: 'Cours', key: 'class' },
      { label: 'Date et heure', key: 'date' },
    ],
    reasonLabel: 'Motif',
    cta: 'Voir mes cours',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

export function getClassCancelledSubject(className: string, lang: Lang): string {
  return T[lang].subject(className)
}

export function buildClassCancelledEmail({
  studentName,
  schoolName,
  schoolCity,
  className,
  scheduledAt,
  reason,
  classesUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  className: string
  scheduledAt: Date
  reason?: string | null
  classesUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const dateStr = scheduledAt.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  )

  const dataValues: Record<'class' | 'date', string> = {
    class: className,
    date: dateStr,
  }

  const rows = t.details.map(d => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;width:100px;">${d.label}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:500;">${dataValues[d.key]}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(className)}</title>
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
            <td style="background:linear-gradient(135deg,${C.red} 0%,${C.navy} 100%);padding:32px 40px;">
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
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body(className, schoolName)}</p>

              <!-- Class details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${reason ? 20 : 28}px;">
                ${rows}
              </table>

              ${reason ? `
              <!-- Reason -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="background:${C.redBg};border-radius:10px;padding:14px 18px;border-left:3px solid ${C.red};">
                  <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:${C.red};text-transform:uppercase;letter-spacing:0.05em;">${t.reasonLabel}</p>
                  <p style="margin:0;font-size:13px;color:${C.text};line-height:1.5;">${reason}</p>
                </td></tr>
              </table>
              ` : ''}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td align="center" style="background:${C.primary};border-radius:10px;">
                  <a href="${classesUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
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
