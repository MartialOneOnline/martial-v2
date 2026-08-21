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
  subject: (school: string) => string
  greeting: (name?: string) => string
  headline: (school: string) => string
  body: (role: string) => string
  features: string[]
  cta: string
  expiry: string
  footer: string
  ignore: string
}> = {
  en: {
    subject: s => `You've been added as staff at ${s} on Martial`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: s => `You've been added to <strong>${s}</strong>`,
    body: role => `You've been added as ${role} on Martial. Click below to activate your account and access your staff dashboard.`,
    features: ['Manage classes and bookings', 'Check members in', 'View your school\'s schedule'],
    cta: 'Activate your account',
    expiry: 'This invitation link expires in 48 hours.',
    footer: 'Sent by Martial on behalf of your school.',
    ignore: 'If you weren\'t expecting this invitation, you can safely ignore this email.',
  },
  es: {
    subject: s => `Te han añadido como staff en ${s} en Martial`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: s => `Has sido añadido a <strong>${s}</strong>`,
    body: role => `Te han añadido como ${role} en Martial. Haz clic abajo para activar tu cuenta y acceder a tu panel de staff.`,
    features: ['Gestiona clases y reservas', 'Haz check-in de miembros', 'Consulta el horario de tu escuela'],
    cta: 'Activar tu cuenta',
    expiry: 'Este enlace de invitación caduca en 48 horas.',
    footer: 'Enviado por Martial en nombre de tu escuela.',
    ignore: 'Si no esperabas esta invitación, puedes ignorar este email de forma segura.',
  },
  pt: {
    subject: s => `Você foi adicionado como equipe em ${s} no Martial`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: s => `Você foi adicionado a <strong>${s}</strong>`,
    body: role => `Você foi adicionado como ${role} no Martial. Clique abaixo para ativar sua conta e acessar seu painel de equipe.`,
    features: ['Gerencie aulas e reservas', 'Faça check-in dos membros', 'Veja o horário da sua escola'],
    cta: 'Ativar minha conta',
    expiry: 'Este link de convite expira em 48 horas.',
    footer: 'Enviado pelo Martial em nome da sua escola.',
    ignore: 'Se você não esperava este convite, pode ignorar este e-mail com segurança.',
  },
  fr: {
    subject: s => `Vous avez été ajouté comme personnel à ${s} sur Martial`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: s => `Vous avez été ajouté à <strong>${s}</strong>`,
    body: role => `Vous avez été ajouté en tant que ${role} sur Martial. Cliquez ci-dessous pour activer votre compte et accéder à votre tableau de bord.`,
    features: ['Gérez les cours et les réservations', 'Enregistrez les membres', 'Consultez le planning de votre école'],
    cta: 'Activer mon compte',
    expiry: 'Ce lien d\'invitation expire dans 48 heures.',
    footer: 'Envoyé par Martial au nom de votre école.',
    ignore: 'Si vous n\'attendiez pas cette invitation, vous pouvez ignorer cet email en toute sécurité.',
  },
}

export function getStaffInviteSubject(schoolName: string, lang: Lang): string {
  return T[lang].subject(schoolName)
}

// ── HTML template ──────────────────────────────────────────────────────────────
export function buildInviteStaffEmail({
  staffName,
  staffRole,
  schoolName,
  schoolCity,
  inviteUrl,
  lang = 'en',
}: {
  staffName?: string | null
  staffRole: string
  schoolName: string
  schoolCity?: string | null
  inviteUrl: string
  lang?: Lang
}): string {
  const t = T[lang]

  const featureItems = t.features.map(f => `
    <tr>
      <td style="padding: 6px 0; vertical-align: top;">
        <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: ${C.primary}14; text-align: center; line-height: 20px; font-size: 11px; margin-right: 10px; color: ${C.primary}; font-weight: 700; flex-shrink: 0;">✓</span>
      </td>
      <td style="padding: 6px 0; font-size: 14px; color: ${C.text}; line-height: 1.5;">${f}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(schoolName)}</title>
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
                      ${schoolCity ? `${schoolCity} · ` : ''}Martial
                    </p>
                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                      ${t.headline(schoolName)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 36px 40px;">

                    <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: ${C.text};">${t.greeting(staffName ?? undefined)}</p>
                    <p style="margin: 0 0 28px; font-size: 14px; color: ${C.muted}; line-height: 1.6;">${t.body(staffRole)}</p>

                    <!-- Features -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: ${C.bg}; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
                      <tr><td>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          ${featureItems}
                        </table>
                      </td></tr>
                    </table>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                      <tr>
                        <td align="center" style="background: ${C.primary}; border-radius: 10px;">
                          <a href="${inviteUrl}"
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
