import { detectLang } from './inviteStudent'
import { fmtPrice } from '../../format'

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
  subject:  (student: string, plan: string) => string
  headline: string
  body:     (student: string, plan: string) => string
  labels:   { student: string; plan: string; price: string; requested: string }
  cta:      string
  note:     string
  footer:   string
}> = {
  en: {
    subject:  (s, p) => `New membership request — ${s} · ${p}`,
    headline: 'New membership request',
    body:     (s, p) => `<strong>${s}</strong> has requested the <strong>${p}</strong> plan and is waiting for your approval.`,
    labels:   { student: 'Student', plan: 'Plan', price: 'Price', requested: 'Requested' },
    cta:      'Review request →',
    note:     'Activate the membership once you confirm payment has been received.',
    footer:   'Sent by Martial on behalf of your school.',
  },
  es: {
    subject:  (s, p) => `Nueva solicitud de membresía — ${s} · ${p}`,
    headline: 'Nueva solicitud de membresía',
    body:     (s, p) => `<strong>${s}</strong> ha solicitado el plan <strong>${p}</strong> y está esperando tu aprobación.`,
    labels:   { student: 'Alumno', plan: 'Plan', price: 'Precio', requested: 'Solicitado' },
    cta:      'Revisar solicitud →',
    note:     'Activa la membresía una vez hayas confirmado que se ha recibido el pago.',
    footer:   'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject:  (s, p) => `Nova solicitação de assinatura — ${s} · ${p}`,
    headline: 'Nova solicitação de assinatura',
    body:     (s, p) => `<strong>${s}</strong> solicitou o plano <strong>${p}</strong> e está aguardando a sua aprovação.`,
    labels:   { student: 'Aluno', plan: 'Plano', price: 'Preço', requested: 'Solicitado' },
    cta:      'Rever solicitação →',
    note:     'Ative a assinatura assim que confirmar o recebimento do pagamento.',
    footer:   'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject:  (s, p) => `Nouvelle demande d'abonnement — ${s} · ${p}`,
    headline: "Nouvelle demande d'abonnement",
    body:     (s, p) => `<strong>${s}</strong> a demandé le plan <strong>${p}</strong> et attend votre approbation.`,
    labels:   { student: 'Élève', plan: 'Abonnement', price: 'Tarif', requested: 'Demandé le' },
    cta:      'Examiner la demande →',
    note:     "Activez l'abonnement une fois le paiement reçu et confirmé.",
    footer:   'Envoyé par Martial au nom de votre école.',
  },
}

export function getMembershipRequestSubject(studentName: string, planName: string, lang: Lang): string {
  return T[lang].subject(studentName, planName)
}

export function buildMembershipRequestEmail({
  adminName,
  studentName,
  schoolName,
  schoolCity,
  planName,
  price,
  currency,
  requestedAt,
  dashboardUrl,
  lang: rawLang,
}: {
  adminName?:  string | null
  studentName: string
  schoolName:  string
  schoolCity?: string | null
  planName:    string
  price:       number
  currency:    string
  requestedAt: Date
  dashboardUrl: string
  lang?:       string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const locale =
    lang === 'es' ? 'es-ES' :
    lang === 'pt' ? 'pt-PT' :
    lang === 'fr' ? 'fr-FR' : 'en-GB'

  const dateStr = requestedAt.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const priceStr = fmtPrice(price, currency)

  const greeting = adminName ? `Hi ${adminName},` : 'Hi,'

  const rows = [
    { label: t.labels.student,   value: studentName },
    { label: t.labels.plan,      value: planName },
    { label: t.labels.price,     value: price > 0 ? priceStr : '—' },
    { label: t.labels.requested, value: dateStr },
  ].map(r => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;width:110px;vertical-align:top;">${r.label}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:500;">${r.value}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(studentName, planName)}</title>
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
                ${schoolCity ? `${schoolCity} · ` : ''}${schoolName}
              </p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${t.headline}</p>
            </td>
          </tr></table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${greeting}</p>
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body(studentName, planName)}</p>

              <!-- Request details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${rows}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="background:${C.primary};border-radius:10px;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta}</a>
                </td></tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="background:${C.amberBg};border-radius:10px;padding:14px 18px;border-left:3px solid ${C.amber};">
                  <p style="margin:0;font-size:13px;color:${C.amber};line-height:1.5;">💡 ${t.note}</p>
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
