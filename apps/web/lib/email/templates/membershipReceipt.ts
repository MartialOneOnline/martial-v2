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
}

const T: Record<Lang, {
  subject: (plan: string) => string
  greeting: (name?: string) => string
  headline: string
  body: string
  labels: { plan: string; amount: string; method: string; start: string; expires: string; ref: string }
  cta: string
  footer: string
}> = {
  en: {
    subject: p => `Payment confirmed — ${p}`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Payment confirmed',
    body: 'Your membership payment has been received. Here\'s your receipt.',
    labels: { plan: 'Plan', amount: 'Amount paid', method: 'Payment method', start: 'Start date', expires: 'Expires', ref: 'Reference' },
    cta: 'View my membership',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: p => `Pago confirmado — ${p}`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Pago confirmado',
    body: 'Hemos recibido tu pago de membresía. Aquí tienes tu recibo.',
    labels: { plan: 'Plan', amount: 'Importe pagado', method: 'Método de pago', start: 'Fecha de inicio', expires: 'Vence', ref: 'Referencia' },
    cta: 'Ver mi membresía',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: p => `Pagamento confirmado — ${p}`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Pagamento confirmado',
    body: 'O seu pagamento de assinatura foi recebido. Aqui está o seu recibo.',
    labels: { plan: 'Plano', amount: 'Valor pago', method: 'Método de pagamento', start: 'Data de início', expires: 'Expira', ref: 'Referência' },
    cta: 'Ver a minha assinatura',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: p => `Paiement confirmé — ${p}`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Paiement confirmé',
    body: 'Votre paiement d\'abonnement a bien été reçu. Voici votre reçu.',
    labels: { plan: 'Abonnement', amount: 'Montant payé', method: 'Moyen de paiement', start: 'Date de début', expires: 'Expire le', ref: 'Référence' },
    cta: 'Voir mon abonnement',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

const METHOD_LABELS: Record<string, Record<Lang, string>> = {
  CASH:          { en: 'Cash', es: 'Efectivo', pt: 'Dinheiro', fr: 'Espèces' },
  BANK_TRANSFER: { en: 'Bank transfer', es: 'Transferencia', pt: 'Transferência', fr: 'Virement' },
  STRIPE:        { en: 'Card (Stripe)', es: 'Tarjeta (Stripe)', pt: 'Cartão (Stripe)', fr: 'Carte (Stripe)' },
  DIRECT_DEBIT:  { en: 'Direct debit', es: 'Domiciliación', pt: 'Débito direto', fr: 'Prélèvement' },
  OTHER:         { en: 'Other', es: 'Otro', pt: 'Outro', fr: 'Autre' },
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount)
}

export function getMembershipReceiptSubject(planName: string, lang: Lang): string {
  return T[lang].subject(planName)
}

export function buildMembershipReceiptEmail({
  studentName,
  schoolName,
  schoolCity,
  planName,
  amount,
  currency,
  paymentMethod,
  startDate,
  endDate,
  membershipId,
  dashboardUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  planName: string
  amount: number
  currency: string
  paymentMethod: string
  startDate: Date
  endDate?: Date | null
  membershipId: string
  dashboardUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const locale = lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB'
  const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }

  const rows: { label: string; value: string }[] = [
    { label: t.labels.plan,   value: planName },
    { label: t.labels.amount, value: fmtAmount(amount, currency) },
    { label: t.labels.method, value: METHOD_LABELS[paymentMethod]?.[lang] ?? paymentMethod },
    { label: t.labels.start,  value: startDate.toLocaleDateString(locale, dateOpts) },
    ...(endDate ? [{ label: t.labels.expires, value: endDate.toLocaleDateString(locale, dateOpts) }] : []),
    { label: t.labels.ref,    value: membershipId.slice(-8).toUpperCase() },
  ]

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;width:120px;">${r.label}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:500;">${r.value}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(planName)}</title>
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
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${t.greeting(studentName ?? undefined)}</p>
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body}</p>

              <!-- Receipt rows -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${rowsHtml}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td align="center" style="background:${C.primary};border-radius:10px;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
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
