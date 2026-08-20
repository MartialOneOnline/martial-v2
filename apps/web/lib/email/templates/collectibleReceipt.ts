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
  subject: (collection: string) => string
  greeting: (name?: string) => string
  headline: string
  body: string
  labels: { collection: string; tier: string; number: string; amount: string; ref: string }
  cta: string
  footer: string
  qrCaption: string
}> = {
  en: {
    subject: c => `Your collectible is confirmed — ${c}`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Collectible confirmed',
    body: 'Your payment has been received — this numbered piece is now yours.',
    labels: { collection: 'Collection', tier: 'Tier', number: 'Edition', amount: 'Amount paid', ref: 'Reference' },
    cta: 'View my collection',
    footer: 'Sent by Martial.',
    qrCaption: 'Scan to verify authenticity',
  },
  es: {
    subject: c => `Tu pieza coleccionable está confirmada — ${c}`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Pieza confirmada',
    body: 'Hemos recibido tu pago — esta pieza numerada ya es tuya.',
    labels: { collection: 'Colección', tier: 'Nivel', number: 'Edición', amount: 'Importe pagado', ref: 'Referencia' },
    cta: 'Ver mi colección',
    footer: 'Enviado por Martial.',
    qrCaption: 'Escanea para verificar la autenticidad',
  },
  pt: {
    subject: c => `A sua peça de coleção está confirmada — ${c}`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Peça confirmada',
    body: 'O seu pagamento foi recebido — esta peça numerada já é sua.',
    labels: { collection: 'Coleção', tier: 'Nível', number: 'Edição', amount: 'Valor pago', ref: 'Referência' },
    cta: 'Ver a minha coleção',
    footer: 'Enviado pelo Martial.',
    qrCaption: 'Digitalize para verificar a autenticidade',
  },
  fr: {
    subject: c => `Votre pièce de collection est confirmée — ${c}`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Pièce confirmée',
    body: 'Votre paiement a bien été reçu — cette pièce numérotée est désormais la vôtre.',
    labels: { collection: 'Collection', tier: 'Niveau', number: 'Édition', amount: 'Montant payé', ref: 'Référence' },
    cta: 'Voir ma collection',
    footer: 'Envoyé par Martial.',
    qrCaption: 'Scannez pour vérifier l\'authenticité',
  },
}

function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount)
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
      <img src="${qrDataUri}" width="180" height="180" alt="Verification QR code" style="display:block;border:1px solid ${C.border};border-radius:12px;" />
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

function shell(sellerLabel: string, headline: string, bodyHtml: string): string {
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
            <td style="background:linear-gradient(135deg,#111827 0%,#000 100%);padding:32px 40px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:${C.cyan};text-transform:uppercase;letter-spacing:0.08em;">${sellerLabel}</p>
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
          <p style="margin:0;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color:#9CA3AF;">martial.one</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function getCollectibleReceiptSubject(collectionName: string, lang?: string | null): string {
  return T[detectLang(lang) as Lang].subject(collectionName)
}

export async function buildCollectibleReceiptEmail({
  ownerName,
  sellerLabel,
  collectionName,
  tierName,
  displayNumber,
  amount,
  currency,
  unitId,
  verificationUrl,
  dashboardUrl,
  lang: rawLang,
}: {
  ownerName?: string | null
  sellerLabel: string
  collectionName: string
  tierName: string
  displayNumber: string
  amount: number
  currency: string
  unitId: string
  verificationUrl: string
  dashboardUrl: string
  lang?: string | null
}): Promise<string> {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const rows = [
    { label: t.labels.collection, value: collectionName },
    { label: t.labels.tier,       value: tierName },
    { label: t.labels.number,     value: displayNumber },
    { label: t.labels.amount,     value: fmtAmount(amount, currency) },
    { label: t.labels.ref,        value: unitId },
  ]

  const { generateUrlQrDataUri } = await import('../qr')
  const qrDataUri = await generateUrlQrDataUri(verificationUrl).catch(() => null)

  const body = `
    <p style="margin:0 0 4px;font-size:15px;color:${C.text};">${t.greeting(ownerName ?? undefined)}</p>
    <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.6;">${t.body}</p>
    ${rowsTable(rows)}
    ${qrDataUri ? qrBlock(qrDataUri, t.qrCaption) : ''}
    ${ctaButton(dashboardUrl, t.cta)}
  `

  return shell(sellerLabel, t.headline, body)
}
