import { detectLang } from './inviteStudent'

type Lang = 'en' | 'es' | 'pt' | 'fr'

const C = {
  primary: '#0071E3',
  navy:    '#0E3A7A',
  bg:      '#F4F6F9',
  card:    '#FFFFFF',
  text:    '#111827',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  red:     '#B91C1C',
  redBg:   '#FEF2F2',
  redLine: '#FECACA',
}

const T: Record<Lang, {
  subject: (plan: string) => string
  greeting: (name?: string) => string
  headline: string
  body: (amount: string, plan: string) => string
  grace: string
  labels: { plan: string; amount: string; nextAttempt: string }
  cta: string
  payNow: string
  footer: string
}> = {
  en: {
    subject: p => `We couldn't collect your payment — ${p}`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: "We couldn't collect your payment",
    body: (a, p) => `Your bank declined the ${a} payment for your ${p} membership.`,
    grace: "We'll retry automatically over the next few days and your access stays active in the meantime. To avoid losing it, check your card or update your payment method.",
    labels: { plan: 'Plan', amount: 'Amount', nextAttempt: 'Next attempt' },
    cta: 'Update payment method',
    payNow: 'Or pay this invoice now',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: p => `No hemos podido cobrar tu pago — ${p}`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'No hemos podido cobrar tu pago',
    body: (a, p) => `Tu banco ha rechazado el cobro de ${a} de tu membresía ${p}.`,
    grace: 'Lo volveremos a intentar automáticamente en los próximos días y mientras tanto mantienes el acceso. Para no perderlo, revisa tu tarjeta o actualiza tu método de pago.',
    labels: { plan: 'Plan', amount: 'Importe', nextAttempt: 'Próximo intento' },
    cta: 'Actualizar método de pago',
    payNow: 'O paga esta factura ahora',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: p => `Não conseguimos cobrar o seu pagamento — ${p}`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Não conseguimos cobrar o seu pagamento',
    body: (a, p) => `O seu banco recusou o pagamento de ${a} da sua assinatura ${p}.`,
    grace: 'Vamos tentar novamente de forma automática nos próximos dias e, entretanto, mantém o acesso. Para não o perder, verifique o seu cartão ou atualize o seu método de pagamento.',
    labels: { plan: 'Plano', amount: 'Valor', nextAttempt: 'Próxima tentativa' },
    cta: 'Atualizar método de pagamento',
    payNow: 'Ou pague esta fatura agora',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: p => `Nous n'avons pas pu prélever votre paiement — ${p}`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: "Nous n'avons pas pu prélever votre paiement",
    body: (a, p) => `Votre banque a refusé le paiement de ${a} pour votre abonnement ${p}.`,
    grace: "Nous réessaierons automatiquement dans les prochains jours et votre accès reste actif en attendant. Pour ne pas le perdre, vérifiez votre carte ou mettez à jour votre moyen de paiement.",
    labels: { plan: 'Abonnement', amount: 'Montant', nextAttempt: 'Prochaine tentative' },
    cta: 'Mettre à jour le moyen de paiement',
    payNow: 'Ou payez cette facture maintenant',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function getMembershipPaymentFailedSubject(planName: string, lang: Lang): string {
  return T[lang].subject(planName)
}

export function buildMembershipPaymentFailedEmail({
  studentName,
  schoolName,
  schoolCity,
  planName,
  amountLabel,
  nextAttemptAt,
  updateUrl,
  invoiceUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  planName: string
  /** Already formatted with fmtPrice. */
  amountLabel: string
  nextAttemptAt?: Date | null
  /** /my/membership — shows the billing-portal button while a payment is outstanding. */
  updateUrl: string
  /** Stripe's hosted invoice page, when the invoice carries one. */
  invoiceUrl?: string | null
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]
  const locale = lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB'

  const plan = esc(planName)
  const rows: { label: string; value: string }[] = [
    { label: t.labels.plan,   value: plan },
    { label: t.labels.amount, value: esc(amountLabel) },
    ...(nextAttemptAt ? [{
      label: t.labels.nextAttempt,
      value: nextAttemptAt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    }] : []),
  ]

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;width:140px;">${r.label}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:500;">${r.value}</td>
    </tr>
  `).join('')

  const payNowHtml = invoiceUrl
    ? `<p style="margin:18px 0 0;text-align:center;font-size:13px;"><a href="${esc(invoiceUrl)}" style="color:${C.primary};text-decoration:underline;">${t.payNow}</a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(t.subject(planName))}</title>
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
            <td style="background:${C.redBg};border-bottom:1px solid ${C.redLine};padding:32px 40px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">
                ${schoolCity ? `${esc(schoolCity)} · ` : ''}${esc(schoolName)}
              </p>
              <p style="margin:0;font-size:22px;font-weight:700;color:${C.red};line-height:1.3;">${t.headline}</p>
            </td>
          </tr></table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${esc(t.greeting(studentName ?? undefined))}</p>
              <p style="margin:0 0 8px;font-size:14px;color:${C.text};line-height:1.6;">${t.body(esc(amountLabel), plan)}</p>
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.grace}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${rowsHtml}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr><td align="center" style="background:${C.primary};border-radius:10px;">
                  <a href="${esc(updateUrl)}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${t.cta} →</a>
                </td></tr>
              </table>
              ${payNowHtml}

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
