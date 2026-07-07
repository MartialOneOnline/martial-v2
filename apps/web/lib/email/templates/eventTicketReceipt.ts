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

const CONFIRM_T: Record<Lang, {
  subject: (event: string) => string
  greeting: (name?: string) => string
  headline: string
  body: string
  labels: { event: string; ticket: string; quantity: string; amount: string; date: string; location: string; ref: string }
  cta: string
  footer: string
  qrCaption: string
}> = {
  en: {
    subject: e => `Ticket confirmed — ${e}`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Ticket confirmed',
    body: 'Your payment has been received — you\'re registered for this event.',
    labels: { event: 'Event', ticket: 'Ticket', quantity: 'Quantity', amount: 'Amount paid', date: 'Date', location: 'Location', ref: 'Reference' },
    cta: 'View my tickets',
    footer: 'Sent by Martial on behalf of your school.',
    qrCaption: 'Show this QR code at check-in',
  },
  es: {
    subject: e => `Entrada confirmada — ${e}`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Entrada confirmada',
    body: 'Hemos recibido tu pago — ya estás inscrito en este evento.',
    labels: { event: 'Evento', ticket: 'Entrada', quantity: 'Cantidad', amount: 'Importe pagado', date: 'Fecha', location: 'Ubicación', ref: 'Referencia' },
    cta: 'Ver mis entradas',
    footer: 'Enviado por Martial en nombre de tu escuela.',
    qrCaption: 'Muestra este código QR en el check-in',
  },
  pt: {
    subject: e => `Bilhete confirmado — ${e}`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Bilhete confirmado',
    body: 'O seu pagamento foi recebido — já está inscrito neste evento.',
    labels: { event: 'Evento', ticket: 'Bilhete', quantity: 'Quantidade', amount: 'Valor pago', date: 'Data', location: 'Localização', ref: 'Referência' },
    cta: 'Ver os meus bilhetes',
    footer: 'Enviado pelo Martial em nome da sua escola.',
    qrCaption: 'Mostre este código QR no check-in',
  },
  fr: {
    subject: e => `Billet confirmé — ${e}`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Billet confirmé',
    body: 'Votre paiement a bien été reçu — vous êtes inscrit à cet événement.',
    labels: { event: 'Événement', ticket: 'Billet', quantity: 'Quantité', amount: 'Montant payé', date: 'Date', location: 'Lieu', ref: 'Référence' },
    cta: 'Voir mes billets',
    footer: 'Envoyé par Martial au nom de votre école.',
    qrCaption: 'Présentez ce code QR au check-in',
  },
}

const REFUND_T: Record<Lang, {
  subject: (event: string) => string
  greeting: (name?: string) => string
  headline: string
  body: string
  labels: { event: string; ticket: string; amount: string; ref: string }
  cta: string
  footer: string
}> = {
  en: {
    subject: e => `Sold out & refunded — ${e}`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Event sold out',
    body: 'This event sold out just before your payment could be confirmed. You have been refunded in full.',
    labels: { event: 'Event', ticket: 'Ticket', amount: 'Amount refunded', ref: 'Reference' },
    cta: 'Browse other events',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: e => `Agotado y reembolsado — ${e}`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Evento agotado',
    body: 'Este evento se agotó justo antes de confirmar tu pago. Se te ha reembolsado el importe completo.',
    labels: { event: 'Evento', ticket: 'Entrada', amount: 'Importe reembolsado', ref: 'Referencia' },
    cta: 'Ver otros eventos',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: e => `Esgotado e reembolsado — ${e}`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Evento esgotado',
    body: 'Este evento esgotou mesmo antes de o seu pagamento ser confirmado. Foi totalmente reembolsado.',
    labels: { event: 'Evento', ticket: 'Bilhete', amount: 'Valor reembolsado', ref: 'Referência' },
    cta: 'Ver outros eventos',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: e => `Complet et remboursé — ${e}`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Événement complet',
    body: 'Cet événement affichait complet juste avant la confirmation de votre paiement. Vous avez été intégralement remboursé.',
    labels: { event: 'Événement', ticket: 'Billet', amount: 'Montant remboursé', ref: 'Référence' },
    cta: 'Voir d\'autres événements',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount)
}

function shell(schoolName: string, schoolCity: string | null | undefined, headline: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:${C.navy};border-radius:12px;padding:10px 20px;">
              <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">MARTIAL</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="background:${C.card};border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:linear-gradient(135deg,${C.primary} 0%,${C.navy} 100%);padding:32px 40px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.cyan};text-transform:uppercase;letter-spacing:0.08em;">
                ${schoolCity ? `${schoolCity} · ` : ''}${schoolName}
              </p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${headline}</p>
            </td>
          </tr></table>

          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:36px 40px;">
              ${bodyHtml}
            </td>
          </tr></table>

        </td></tr>

        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">${schoolName}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color:#9CA3AF;">martial.one</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function rowsTable(rows: { label: string; value: string }[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    ${rows.map(r => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:12px;font-weight:600;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;width:120px;">${r.label}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};font-weight:500;">${r.value}</td>
    </tr>
  `).join('')}
  </table>`
}

function qrBlock(qrDataUri: string, caption: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
    <tr><td align="center">
      <img src="${qrDataUri}" width="180" height="180" alt="Check-in QR code" style="display:block;border:1px solid ${C.border};border-radius:12px;" />
      <p style="margin:10px 0 0;font-size:12px;color:${C.muted};">${caption}</p>
    </td></tr>
  </table>`
}

function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td align="center" style="background:${C.primary};border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-0.01em;">${label} →</a>
    </td></tr>
  </table>`
}

export function getEventTicketConfirmationSubject(eventTitle: string, lang: Lang): string {
  return CONFIRM_T[lang].subject(eventTitle)
}

export function buildEventTicketConfirmationEmail({
  studentName,
  schoolName,
  schoolCity,
  eventTitle,
  ticketName,
  quantity,
  amount,
  currency,
  startAt,
  location,
  bookingId,
  dashboardUrl,
  qrDataUri,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  eventTitle: string
  ticketName: string
  quantity: number
  amount: number
  currency: string
  startAt: Date
  location?: string | null
  bookingId: string
  dashboardUrl: string
  qrDataUri?: string | null
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = CONFIRM_T[lang]
  const locale = lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB'

  const rows = [
    { label: t.labels.event,    value: eventTitle },
    { label: t.labels.ticket,   value: ticketName },
    { label: t.labels.quantity, value: String(quantity) },
    { label: t.labels.amount,   value: fmtAmount(amount, currency) },
    { label: t.labels.date,     value: startAt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) },
    ...(location ? [{ label: t.labels.location, value: location }] : []),
    { label: t.labels.ref,      value: bookingId.slice(-8).toUpperCase() },
  ]

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${t.greeting(studentName ?? undefined)}</p>
    <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body}</p>
    ${rowsTable(rows)}
    ${qrDataUri ? qrBlock(qrDataUri, t.qrCaption) : ''}
    ${ctaButton(dashboardUrl, t.cta)}
  `
  return shell(schoolName, schoolCity, t.headline, bodyHtml)
}

export function getEventTicketRefundSubject(eventTitle: string, lang: Lang): string {
  return REFUND_T[lang].subject(eventTitle)
}

export function buildEventTicketRefundEmail({
  studentName,
  schoolName,
  schoolCity,
  eventTitle,
  ticketName,
  amount,
  currency,
  bookingId,
  dashboardUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  eventTitle: string
  ticketName: string
  amount: number
  currency: string
  bookingId: string
  dashboardUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = REFUND_T[lang]

  const rows = [
    { label: t.labels.event,  value: eventTitle },
    { label: t.labels.ticket, value: ticketName },
    { label: t.labels.amount, value: fmtAmount(amount, currency) },
    { label: t.labels.ref,    value: bookingId.slice(-8).toUpperCase() },
  ]

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${t.greeting(studentName ?? undefined)}</p>
    <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body}</p>
    ${rowsTable(rows)}
    ${ctaButton(dashboardUrl, t.cta)}
  `
  return shell(schoolName, schoolCity, t.headline, bodyHtml)
}
