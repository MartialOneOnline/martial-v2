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
  subject: (school: string) => string
  greeting: (name?: string) => string
  headline: string
  body: (school: string) => string
  items: string[]
  cta: string
  footer: string
}> = {
  en: {
    subject: s => `Welcome to ${s} on Martial`,
    greeting: n => n ? `Welcome, ${n}!` : 'Welcome!',
    headline: 'Your account is ready',
    body: s => `You're now part of <strong>${s}</strong>. Your training dashboard is live — track your classes, belt progress, and membership from one place.`,
    items: ['View your upcoming classes', 'Track your belt and progress', 'Manage your membership'],
    cta: 'Go to my dashboard',
    footer: 'Sent by Martial on behalf of your school.',
  },
  es: {
    subject: s => `Bienvenido a ${s} en Martial`,
    greeting: n => n ? `¡Bienvenido, ${n}!` : '¡Bienvenido!',
    headline: 'Tu cuenta está lista',
    body: s => `Ya eres parte de <strong>${s}</strong>. Tu panel de entrenamiento está activo — consulta tus clases, tu progreso de cinturón y tu membresía desde un solo lugar.`,
    items: ['Ver tus próximas clases', 'Seguir tu cinturón y progreso', 'Gestionar tu membresía'],
    cta: 'Ir a mi panel',
    footer: 'Enviado por Martial en nombre de tu escuela.',
  },
  pt: {
    subject: s => `Bem-vindo a ${s} no Martial`,
    greeting: n => n ? `Bem-vindo, ${n}!` : 'Bem-vindo!',
    headline: 'A sua conta está pronta',
    body: s => `Agora faz parte de <strong>${s}</strong>. O seu painel de treino está ativo — consulte as suas aulas, progresso de cinto e assinatura num só lugar.`,
    items: ['Ver as suas próximas aulas', 'Acompanhar o seu cinto e progresso', 'Gerir a sua assinatura'],
    cta: 'Ir ao meu painel',
    footer: 'Enviado pelo Martial em nome da sua escola.',
  },
  fr: {
    subject: s => `Bienvenue chez ${s} sur Martial`,
    greeting: n => n ? `Bienvenue, ${n} !` : 'Bienvenue !',
    headline: 'Votre compte est prêt',
    body: s => `Vous faites maintenant partie de <strong>${s}</strong>. Votre tableau de bord est actif — consultez vos cours, votre progression de ceinture et votre abonnement en un seul endroit.`,
    items: ['Voir vos prochains cours', 'Suivre votre ceinture et progression', 'Gérer votre abonnement'],
    cta: 'Accéder à mon tableau de bord',
    footer: 'Envoyé par Martial au nom de votre école.',
  },
}

export function getWelcomeStudentSubject(schoolName: string, lang: Lang): string {
  return T[lang].subject(schoolName)
}

export function buildWelcomeStudentEmail({
  studentName,
  schoolName,
  schoolCity,
  dashboardUrl,
  lang: rawLang,
}: {
  studentName?: string | null
  schoolName: string
  schoolCity?: string | null
  dashboardUrl: string
  lang?: string | null
}): string {
  const lang = detectLang(rawLang) as Lang
  const t = T[lang]

  const items = t.items.map(item => `
    <tr>
      <td style="padding: 6px 0; vertical-align: top; width: 24px;">
        <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${C.primary}14;text-align:center;line-height:18px;font-size:10px;color:${C.primary};font-weight:700;">✓</span>
      </td>
      <td style="padding: 6px 0; font-size: 14px; color: ${C.text}; line-height: 1.5;">${item}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.subject(schoolName)}</title>
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
                ${schoolCity ? `${schoolCity} · ` : ''}Martial
              </p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${t.headline}</p>
            </td>
          </tr></table>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${C.text};">${t.greeting(studentName ?? undefined)}</p>
              <p style="margin:0 0 28px;font-size:14px;color:${C.muted};line-height:1.6;">${t.body(schoolName)}</p>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <tr><td><table cellpadding="0" cellspacing="0" width="100%">${items}</table></td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
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
