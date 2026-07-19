// Martial brand colors
const C = {
  primary:  '#0071E3',
  navy:     '#0E3A7A',
  cyan:     '#7DE7EC',
  bg:       '#F4F6F9',
  card:     '#FFFFFF',
  text:     '#111827',
  muted:    '#6B7280',
  border:   '#E5E7EB',
}

// ── i18n strings ───────────────────────────────────────────────────────────────
type Lang = 'en' | 'es' | 'pt' | 'fr'

const T: Record<Lang, {
  subject: string
  greeting: (name?: string) => string
  headline: string
  body: string
  cta: string
  expiry: string
  footer: string
  ignore: string
}> = {
  en: {
    subject: 'Confirm your email for Martial',
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Confirm your email address',
    body: 'Click below to confirm your email and activate your Martial account.',
    cta: 'Confirm my email',
    expiry: 'This confirmation link expires in 24 hours.',
    footer: 'Sent by Martial.',
    ignore: 'If you didn\'t create this account, you can safely ignore this email.',
  },
  es: {
    subject: 'Confirma tu email para Martial',
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Confirma tu dirección de email',
    body: 'Haz clic abajo para confirmar tu email y activar tu cuenta de Martial.',
    cta: 'Confirmar mi email',
    expiry: 'Este enlace de confirmación caduca en 24 horas.',
    footer: 'Enviado por Martial.',
    ignore: 'Si no creaste esta cuenta, puedes ignorar este email de forma segura.',
  },
  pt: {
    subject: 'Confirme seu email para o Martial',
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Confirme seu endereço de email',
    body: 'Clique abaixo para confirmar seu email e ativar sua conta no Martial.',
    cta: 'Confirmar meu email',
    expiry: 'Este link de confirmação expira em 24 horas.',
    footer: 'Enviado pelo Martial.',
    ignore: 'Se você não criou esta conta, pode ignorar este e-mail com segurança.',
  },
  fr: {
    subject: 'Confirmez votre email pour Martial',
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Confirmez votre adresse email',
    body: 'Cliquez ci-dessous pour confirmer votre email et activer votre compte Martial.',
    cta: 'Confirmer mon email',
    expiry: 'Ce lien de confirmation expire dans 24 heures.',
    footer: 'Envoyé par Martial.',
    ignore: 'Si vous n\'avez pas créé ce compte, vous pouvez ignorer cet email en toute sécurité.',
  },
}

export function getConfirmSubject(lang: Lang): string {
  return T[lang].subject
}

// ── HTML template ──────────────────────────────────────────────────────────────
export function buildConfirmEmail({
  name,
  confirmUrl,
  lang = 'en',
}: {
  name?: string | null
  confirmUrl: string
  lang?: Lang
}): string {
  const t = T[lang]

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background: ${C.bg}; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: ${C.navy}; border-radius: 12px; padding: 10px 20px;">
                    <span style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">MARTIAL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background: ${C.card}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07);">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${C.primary} 0%, ${C.navy} 100%); padding: 32px 40px; text-align: left;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: ${C.cyan}; text-transform: uppercase; letter-spacing: 0.08em;">
                      Martial
                    </p>
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                      ${t.headline}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 36px 40px;">

                    <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: ${C.text};">${t.greeting(name ?? undefined)}</p>
                    <p style="margin: 0 0 28px; font-size: 14px; color: ${C.muted}; line-height: 1.6;">${t.body}</p>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                      <tr>
                        <td align="center" style="background: ${C.primary}; border-radius: 10px;">
                          <a href="${confirmUrl}"
                            style="display: inline-block; padding: 14px 36px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: -0.01em;">
                            ${t.cta} →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry note -->
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${C.muted}; text-align: center;">${t.expiry}</p>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                      <tr><td style="border-top: 1px solid ${C.border};"></td></tr>
                    </table>

                    <!-- Ignore note -->
                    <p style="margin: 0; font-size: 12px; color: ${C.muted}; line-height: 1.5;">${t.ignore}</p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">${t.footer}</p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #9CA3AF;">
                © ${new Date().getFullYear()} Martial · <a href="https://martial.one" style="color: #9CA3AF;">martial.one</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
