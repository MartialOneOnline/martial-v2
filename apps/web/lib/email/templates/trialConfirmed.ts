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
  subject: (school: string) => string
  greeting: (name?: string) => string
  headline: string
  body: (school: string) => string
  details: { label: string; key: 'class' | 'date' | 'location' }[]
  cta: string
  note: string
  footer: string
}> = {
  en: {
    subject: s => `Your free trial at ${s} is confirmed`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Your trial class is booked',
    body: s => `Great news — your free trial at <strong>${s}</strong> has been confirmed. We look forward to seeing you on the mat.`,
    details: [
      { label: 'Class', key: 'class' },
      { label: 'Date & time', key: 'date' },
      { label: 'Location', key: 'location' },
    ],
    cta: 'View my booking',
    note: 'Arrive 10 minutes early to meet your instructor and get settled.',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: s => `Tu clase de prueba en ${s} está confirmada`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Tu clase de prueba está reservada',
    body: s => `Buenas noticias — tu prueba gratuita en <strong>${s}</strong> ha sido confirmada. ¡Te esperamos en el tatami!`,
    details: [
      { label: 'Clase', key: 'class' },
      { label: 'Fecha y hora', key: 'date' },
      { label: 'Ubicación', key: 'location' },
    ],
    cta: 'Ver mi reserva',
    note: 'Llega 10 minutos antes para conocer a tu instructor.',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: s => `A sua aula experimental em ${s} está confirmada`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'A sua aula experimental está reservada',
    body: s => `Ótimas notícias — a sua aula experimental em <strong>${s}</strong> foi confirmada. Esperamos vê-lo no tatame!`,
    details: [
      { label: 'Aula', key: 'class' },
      { label: 'Data e hora', key: 'date' },
      { label: 'Localização', key: 'location' },
    ],
    cta: 'Ver a minha reserva',
    note: 'Chegue 10 minutos antes para conhecer o seu instrutor.',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: s => `Votre cours d'essai chez ${s} est confirmé`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Votre cours d\'essai est réservé',
    body: s => `Bonne nouvelle — votre cours d\'essai chez <strong>${s}</strong> est confirmé. À bientôt sur le tatami !`,
    details: [
      { label: 'Cours', key: 'class' },
      { label: 'Date et heure', key: 'date' },
      { label: 'Lieu', key: 'location' },
    ],
    cta: 'Voir ma réservation',
    note: 'Arrivez 10 minutes à l\'avance pour rencontrer votre instructeur.',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

export function getTrialConfirmedSubject(schoolName: string, lang: Lang): string {
  return T[lang].subject(schoolName)
}

export function buildTrialConfirmedEmail({
  studentName,
  schoolName,
  schoolCity,
  className,
  scheduledAt,
  location,
  bookingUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  className: string
  scheduledAt: Date
  location?: string | null
  bookingUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const dateStr = scheduledAt.toLocaleDateString(
    lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  )

  const dataValues: Record<'class' | 'date' | 'location', string> = {
    class: className,
    date: dateStr,
    location: location ?? schoolName,
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
  <title>${t.subject(schoolName)}</title>
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
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body(schoolName)}</p>

              <!-- Booking details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${rows}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr><td align="center" style="background:${C.primary};border-radius:10px;">
                  <a href="${bookingUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
                </td></tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr><td style="background:${C.greenBg};border-radius:10px;padding:14px 18px;border-left:3px solid ${C.green};">
                  <p style="margin:0;font-size:13px;color:${C.green};line-height:1.5;">💡 ${t.note}</p>
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
