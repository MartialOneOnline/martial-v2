// 6-digit code to confirm a real email that replaces an Apple
// "Hide My Email" relay address (lib/emailChange.ts).
const C = {
  primary: '#0071E3',
  navy: '#0E3A7A',
  cyan: '#7DE7EC',
  bg: '#F4F6F9',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
}

type Lang = 'en' | 'es' | 'pt' | 'fr'

const T: Record<Lang, { subject: string; headline: string; body: string; expiry: string; ignore: string; footer: string }> = {
  en: {
    subject: 'Your Martial verification code',
    headline: 'Confirm your email',
    body: 'Enter this code in Martial to use this address for your account:',
    expiry: 'The code expires in 15 minutes.',
    ignore: 'If you didn\'t ask for this, you can ignore this email: nothing will change.',
    footer: 'Sent by Martial.',
  },
  es: {
    subject: 'Tu código de verificación de Martial',
    headline: 'Confirma tu email',
    body: 'Escribe este código en Martial para usar esta dirección en tu cuenta:',
    expiry: 'El código caduca en 15 minutos.',
    ignore: 'Si no lo has pedido, puedes ignorar este email: no cambiará nada.',
    footer: 'Enviado por Martial.',
  },
  pt: {
    subject: 'Seu código de verificação do Martial',
    headline: 'Confirme seu email',
    body: 'Digite este código no Martial para usar este endereço na sua conta:',
    expiry: 'O código expira em 15 minutos.',
    ignore: 'Se você não pediu isto, pode ignorar este email: nada vai mudar.',
    footer: 'Enviado pelo Martial.',
  },
  fr: {
    subject: 'Votre code de vérification Martial',
    headline: 'Confirmez votre email',
    body: 'Saisissez ce code dans Martial pour utiliser cette adresse sur votre compte :',
    expiry: 'Le code expire dans 15 minutes.',
    ignore: 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email : rien ne changera.',
    footer: 'Envoyé par Martial.',
  },
}

export function getEmailChangeCodeSubject(lang: Lang): string {
  return T[lang].subject
}

export function buildEmailChangeCodeEmail({ code, lang = 'en' }: { code: string; lang?: Lang }): string {
  const t = T[lang]
  const digits = code.replace(/\D/g, '').slice(0, 6)
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${C.bg}; padding: 40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
        <tr><td align="center" style="padding-bottom: 28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background: ${C.navy}; border-radius: 12px; padding: 10px 20px;">
              <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">MARTIAL</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background: ${C.card}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background: linear-gradient(135deg, ${C.primary} 0%, ${C.navy} 100%); padding: 32px 40px;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: ${C.cyan}; text-transform: uppercase; letter-spacing: 0.08em;">Martial</p>
              <p style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">${t.headline}</p>
            </td>
          </tr></table>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding: 36px 40px;">
              <p style="margin: 0 0 20px; font-size: 14px; color: ${C.muted}; line-height: 1.6;">${t.body}</p>
              <p style="margin: 0 0 20px; text-align: center; font-size: 34px; font-weight: 800; letter-spacing: 0.3em; color: ${C.text}; font-family: 'SF Mono', Menlo, Consolas, monospace;">${digits}</p>
              <p style="margin: 0 0 4px; font-size: 12px; color: ${C.muted}; text-align: center;">${t.expiry}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;"><tr><td style="border-top: 1px solid ${C.border};"></td></tr></table>
              <p style="margin: 0; font-size: 12px; color: ${C.muted}; line-height: 1.5;">${t.ignore}</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding: 24px 0; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #9CA3AF;">${t.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
