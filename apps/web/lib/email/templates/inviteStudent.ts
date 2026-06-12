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
  body: string
  features: string[]
  cta: string
  expiry: string
  footer: string
  ignore: string
}> = {
  en: {
    subject: s => `You've been invited to join ${s} on Martial`,
    greeting: n => n ? `Hi ${n},` : 'Hi,',
    headline: s => `You've been invited to join <strong>${s}</strong>`,
    body: 'Your instructor has added you to their school on Martial. Click below to activate your account and access your training dashboard.',
    features: ['View your classes and schedule', 'Track your belt progress', 'Manage your membership'],
    cta: 'Activate your account',
    expiry: 'This invitation link expires in 48 hours.',
    footer: 'Sent by Martial on behalf of your school.',
    ignore: 'If you weren\'t expecting this invitation, you can safely ignore this email.',
  },
  es: {
    subject: s => `Te han invitado a unirte a ${s} en Martial`,
    greeting: n => n ? `Hola ${n},` : 'Hola,',
    headline: s => `Has sido invitado a <strong>${s}</strong>`,
    body: 'Tu instructor te ha añadido a su escuela en Martial. Haz clic abajo para activar tu cuenta y acceder a tu panel de entrenamiento.',
    features: ['Consulta tus clases y horarios', 'Sigue tu progreso de cinturón', 'Gestiona tu membresía'],
    cta: 'Activar tu cuenta',
    expiry: 'Este enlace de invitación caduca en 48 horas.',
    footer: 'Enviado por Martial en nombre de tu escuela.',
    ignore: 'Si no esperabas esta invitación, puedes ignorar este email de forma segura.',
  },
  pt: {
    subject: s => `Você foi convidado para entrar em ${s} no Martial`,
    greeting: n => n ? `Olá ${n},` : 'Olá,',
    headline: s => `Você foi convidado para <strong>${s}</strong>`,
    body: 'Seu instrutor adicionou você à escola no Martial. Clique abaixo para ativar sua conta e acessar seu painel de treino.',
    features: ['Veja suas aulas e horários', 'Acompanhe seu progresso no cinturão', 'Gerencie sua assinatura'],
    cta: 'Ativar minha conta',
    expiry: 'Este link de convite expira em 48 horas.',
    footer: 'Enviado pelo Martial em nome da sua escola.',
    ignore: 'Se você não esperava este convite, pode ignorar este e-mail com segurança.',
  },
  fr: {
    subject: s => `Vous avez été invité à rejoindre ${s} sur Martial`,
    greeting: n => n ? `Bonjour ${n},` : 'Bonjour,',
    headline: s => `Vous avez été invité à rejoindre <strong>${s}</strong>`,
    body: 'Votre instructeur vous a ajouté à son école sur Martial. Cliquez ci-dessous pour activer votre compte et accéder à votre tableau de bord.',
    features: ['Consultez vos cours et horaires', 'Suivez vos progrès de ceinture', 'Gérez votre abonnement'],
    cta: 'Activer mon compte',
    expiry: 'Ce lien d\'invitation expire dans 48 heures.',
    footer: 'Envoyé par Martial au nom de votre école.',
    ignore: 'Si vous n\'attendiez pas cette invitation, vous pouvez ignorer cet email en toute sécurité.',
  },
}

// ── Language detection from country ───────────────────────────────────────────
const ES_COUNTRIES = new Set(['ES','MX','AR','CO','CL','PE','VE','EC','BO','PY','UY','CR','PA','DO','GT','HN','NI','SV','CU','PR'])
const PT_COUNTRIES = new Set(['BR','PT','AO','MZ'])
const FR_COUNTRIES = new Set(['FR','BE','CH','LU','MC','SN','CI','CM','MA','TN','DZ'])

export function detectLang(country?: string | null): Lang {
  if (!country) return 'en'
  const c = country.toUpperCase()
  if (ES_COUNTRIES.has(c)) return 'es'
  if (PT_COUNTRIES.has(c)) return 'pt'
  if (FR_COUNTRIES.has(c)) return 'fr'
  return 'en'
}

export function getInviteSubject(schoolName: string, lang: Lang): string {
  return T[lang].subject(schoolName)
}

// ── HTML template ──────────────────────────────────────────────────────────────
export function buildInviteStudentEmail({
  studentName,
  schoolName,
  schoolCity,
  inviteUrl,
  lang = 'en',
}: {
  studentName?: string | null
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

                    <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: ${C.text};">${t.greeting(studentName ?? undefined)}</p>
                    <p style="margin: 0 0 28px; font-size: 14px; color: ${C.muted}; line-height: 1.6;">${t.body}</p>

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
