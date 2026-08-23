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
    subject: 'Reset your Martial password',
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: 'Reset your password',
    body: 'We received a request to reset your password. Click below to choose a new one.',
    cta: 'Reset my password',
    expiry: 'For your security, this link expires soon and can only be used once.',
    footer: 'Sent by Martial.',
    ignore: 'If you didn\'t request this, you can safely ignore this email — your password will stay the same.',
  },
  es: {
    subject: 'Restablece tu contraseña de Martial',
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: 'Restablece tu contraseña',
    body: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic abajo para elegir una nueva.',
    cta: 'Restablecer mi contraseña',
    expiry: 'Por tu seguridad, este enlace caduca pronto y solo se puede usar una vez.',
    footer: 'Enviado por Martial.',
    ignore: 'Si no solicitaste esto, puedes ignorar este email de forma segura — tu contraseña no cambiará.',
  },
  pt: {
    subject: 'Redefina sua senha do Martial',
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: 'Redefina sua senha',
    body: 'Recebemos uma solicitação para redefinir sua senha. Clique abaixo para escolher uma nova.',
    cta: 'Redefinir minha senha',
    expiry: 'Por segurança, este link expira em breve e só pode ser usado uma vez.',
    footer: 'Enviado pelo Martial.',
    ignore: 'Se você não solicitou isso, pode ignorar este e-mail com segurança — sua senha permanecerá a mesma.',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe Martial',
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: 'Réinitialisez votre mot de passe',
    body: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau.',
    cta: 'Réinitialiser mon mot de passe',
    expiry: 'Pour votre sécurité, ce lien expire bientôt et ne peut être utilisé qu\'une seule fois.',
    footer: 'Envoyé par Martial.',
    ignore: 'Si vous n\'avez pas demandé cela, vous pouvez ignorer cet email en toute sécurité — votre mot de passe restera inchangé.',
  },
}

export function getResetPasswordSubject(lang: Lang): string {
  return T[lang].subject
}

// ── HTML template ──────────────────────────────────────────────────────────────
export function buildResetPasswordEmail({
  name,
  resetUrl,
  lang = 'en',
}: {
  name?: string | null
  resetUrl: string
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
                          <a href="${resetUrl}"
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
