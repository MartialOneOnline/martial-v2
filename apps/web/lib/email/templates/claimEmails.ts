// Emails of the school-ownership flow. Public-facing ones (requester ack,
// owner invitation, inbox verification) come in EN/ES/PT/FR; the super-admin
// notice is English like the rest of the admin panel.
//
// Every interpolated value is escaped — request fields are typed by anonymous
// visitors. The owner invitation must stay deterministic for identical inputs
// (no dates/years): a technical retry resends the byte-identical body under
// the same Resend Idempotency-Key, and Resend rejects a reused key whose body
// changed.

export type ClaimLang = 'en' | 'es' | 'pt' | 'fr'

export function claimLang(value: string | null | undefined): ClaimLang {
  const v = (value ?? '').toLowerCase().slice(0, 2)
  return v === 'es' || v === 'pt' || v === 'fr' ? v : 'en'
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Subject lines are plain text, but keep CR/LF out of headers.
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 150)
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
}

const C = { bg: '#F4F7FB', surface: '#FFFFFF', text: '#101828', secondary: '#667085', muted: '#98A2B3', navy: '#0E3A7A', primary: '#0870E2' }

function layout(lang: ClaimLang, title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td style="background:${C.surface};border-radius:20px;padding:34px 30px;">
<p style="margin:0 0 22px;font-size:13px;font-weight:800;letter-spacing:.12em;color:${C.navy};">MARTIAL</p>
${inner}
</td></tr></table></td></tr></table></body></html>`
}

function button(href: string, label: string): string {
  return `<p style="margin:26px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${C.primary};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">${escapeHtml(label)}</a></p>`
}

function para(text: string, muted = false): string {
  return `<p style="margin:0 0 14px;font-size:${muted ? 13 : 15}px;line-height:1.6;color:${muted ? C.secondary : C.text};">${text}</p>`
}

// ── Owner invitation ─────────────────────────────────────────────────────────

const INVITE = {
  en: {
    subject: 'Manage {school} on Martial',
    hi: 'Hi {name},',
    bodyRequest: 'We reviewed your request to manage <strong>{school}</strong> on Martial. Use the button below to accept the invitation and access the school dashboard.',
    bodyDirect: 'You have been invited to manage <strong>{school}</strong> on Martial. Use the button below to accept the invitation and access the school dashboard.',
    cta: 'Accept invitation',
    note: 'For security we will ask you to confirm this email address. The link works once and expires in {days} days. If you did not expect this email, you can ignore it.',
  },
  es: {
    subject: 'Gestiona {school} en Martial',
    hi: 'Hola {name}:',
    bodyRequest: 'Hemos revisado tu solicitud para gestionar <strong>{school}</strong> en Martial. Pulsa el botón para aceptar la invitación y entrar en el panel de la escuela.',
    bodyDirect: 'Te han invitado a gestionar <strong>{school}</strong> en Martial. Pulsa el botón para aceptar la invitación y entrar en el panel de la escuela.',
    cta: 'Aceptar invitación',
    note: 'Por seguridad te pediremos confirmar este email. El enlace sirve una sola vez y caduca en {days} días. Si no esperabas este correo, puedes ignorarlo.',
  },
  pt: {
    subject: 'Gerir {school} no Martial',
    hi: 'Olá {name},',
    bodyRequest: 'Analisámos o seu pedido para gerir <strong>{school}</strong> no Martial. Use o botão abaixo para aceitar o convite e aceder ao painel da escola.',
    bodyDirect: 'Foi convidado para gerir <strong>{school}</strong> no Martial. Use o botão abaixo para aceitar o convite e aceder ao painel da escola.',
    cta: 'Aceitar convite',
    note: 'Por segurança vamos pedir-lhe que confirme este email. O link só funciona uma vez e expira em {days} dias. Se não esperava este email, pode ignorá-lo.',
  },
  fr: {
    subject: 'Gérez {school} sur Martial',
    hi: 'Bonjour {name},',
    bodyRequest: 'Nous avons examiné votre demande pour gérer <strong>{school}</strong> sur Martial. Utilisez le bouton ci-dessous pour accepter l’invitation et accéder au tableau de bord de l’école.',
    bodyDirect: 'Vous avez été invité à gérer <strong>{school}</strong> sur Martial. Utilisez le bouton ci-dessous pour accepter l’invitation et accéder au tableau de bord de l’école.',
    cta: 'Accepter l’invitation',
    note: 'Par sécurité, nous vous demanderons de confirmer cette adresse email. Le lien ne fonctionne qu’une fois et expire dans {days} jours. Si vous n’attendiez pas cet email, ignorez-le.',
  },
} as const

export function buildOwnerInviteEmail(p: {
  lang: ClaimLang; schoolName: string; recipientName: string | null; inviteUrl: string; fromRequest: boolean; ttlDays: number
}): { subject: string; html: string; text: string } {
  const t = INVITE[p.lang]
  const school = escapeHtml(p.schoolName)
  const name = escapeHtml(p.recipientName?.trim() || '')
  const subject = oneLine(fill(t.subject, { school: p.schoolName }))
  const body = fill(p.fromRequest ? t.bodyRequest : t.bodyDirect, { school })
  const note = fill(t.note, { days: String(p.ttlDays) })
  const html = layout(p.lang, subject, [
    name ? para(fill(t.hi, { name })) : '',
    para(body),
    button(p.inviteUrl, t.cta),
    para(escapeHtml(note), true),
  ].join(''))
  const plain = (s: string) => s.replace(/<[^>]+>/g, '')
  const text = [name ? plain(fill(t.hi, { name: p.recipientName!.trim() })) : '', plain(fill(p.fromRequest ? t.bodyRequest : t.bodyDirect, { school: p.schoolName })), '', `${t.cta}: ${p.inviteUrl}`, '', note]
    .filter((l, i) => l !== '' || i > 0).join('\n')
  return { subject, html, text }
}

// ── Inbox verification (Supabase signed link) ────────────────────────────────

const VERIFY = {
  en: { subject: 'Confirm your email to manage {school}', body: 'Confirm that this is your email address to finish accepting the invitation to manage <strong>{school}</strong>.', cta: 'Confirm email', note: 'This link expires soon and works once. If you did not ask for it, ignore this email.' },
  es: { subject: 'Confirma tu email para gestionar {school}', body: 'Confirma que este es tu email para terminar de aceptar la invitación para gestionar <strong>{school}</strong>.', cta: 'Confirmar email', note: 'Este enlace caduca pronto y sirve una vez. Si no lo has pedido, ignora este correo.' },
  pt: { subject: 'Confirme o seu email para gerir {school}', body: 'Confirme que este é o seu email para concluir a aceitação do convite para gerir <strong>{school}</strong>.', cta: 'Confirmar email', note: 'Este link expira em breve e só funciona uma vez. Se não o pediu, ignore este email.' },
  fr: { subject: 'Confirmez votre email pour gérer {school}', body: 'Confirmez que c’est bien votre adresse pour finir d’accepter l’invitation à gérer <strong>{school}</strong>.', cta: 'Confirmer l’email', note: 'Ce lien expire bientôt et ne fonctionne qu’une fois. Si vous ne l’avez pas demandé, ignorez cet email.' },
} as const

export function buildClaimVerifyEmail(p: { lang: ClaimLang; schoolName: string; verifyUrl: string }): { subject: string; html: string } {
  const t = VERIFY[p.lang]
  const subject = oneLine(fill(t.subject, { school: p.schoolName }))
  const html = layout(p.lang, subject, para(fill(t.body, { school: escapeHtml(p.schoolName) })) + button(p.verifyUrl, t.cta) + para(escapeHtml(t.note), true))
  return { subject, html }
}

// ── Acknowledgement to the requester ─────────────────────────────────────────

const RECEIVED = {
  en: { subject: 'We received your request for {school}', hi: 'Hi {name},', body: 'Thanks for asking to manage <strong>{school}</strong> on Martial. Our team will review the request and, if everything checks out, email you an invitation.', note: '— The Martial team' },
  es: { subject: 'Hemos recibido tu solicitud para {school}', hi: 'Hola {name}:', body: 'Gracias por solicitar gestionar <strong>{school}</strong> en Martial. Nuestro equipo revisará la solicitud y, si todo está correcto, te enviará una invitación por email.', note: '— El equipo de Martial' },
  pt: { subject: 'Recebemos o seu pedido para {school}', hi: 'Olá {name},', body: 'Obrigado por pedir para gerir <strong>{school}</strong> no Martial. A nossa equipa vai analisar o pedido e, se estiver tudo certo, enviar-lhe um convite por email.', note: '— A equipa Martial' },
  fr: { subject: 'Nous avons reçu votre demande pour {school}', hi: 'Bonjour {name},', body: 'Merci d’avoir demandé à gérer <strong>{school}</strong> sur Martial. Notre équipe va examiner la demande et, si tout est en ordre, vous enverra une invitation par email.', note: '— L’équipe Martial' },
} as const

export function buildClaimReceivedEmail(p: { lang: ClaimLang; contactName: string; schoolName: string }): { subject: string; html: string } {
  const t = RECEIVED[p.lang]
  const subject = oneLine(fill(t.subject, { school: p.schoolName }))
  const html = layout(p.lang, subject,
    para(fill(t.hi, { name: escapeHtml(p.contactName) })) + para(fill(t.body, { school: escapeHtml(p.schoolName) })) + para(escapeHtml(t.note), true))
  return { subject, html }
}

// ── Super-admin notice (English, like the admin panel) ───────────────────────

export function buildAdminClaimNotice(p: {
  schoolName: string; city: string | null; contactName: string; contactEmail: string
  phone: string | null; message: string | null; sourceSchoolName: string | null; detailUrl: string
}): { subject: string; html: string } {
  const row = (label: string, value: string | null) => value
    ? `<tr><td style="padding:6px 12px 6px 0;color:${C.secondary};vertical-align:top;width:120px;">${label}</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`
    : ''
  const subject = oneLine(`School ownership request: ${p.schoolName}`)
  const html = layout('en', subject, `
<p style="margin:0 0 16px;font-size:18px;font-weight:700;">New school ownership request</p>
<table role="presentation" style="font-size:14px;border-collapse:collapse;">
${row('School', p.schoolName)}${row('City', p.city)}${row('Contact', p.contactName)}${row('Email', p.contactEmail)}${row('Phone', p.phone)}${row('Started from', p.sourceSchoolName)}${row('Message', p.message)}
</table>
${button(p.detailUrl, 'Review request')}
${para('The request is saved in Admin → Verification Queue → Ownership requests. Nothing has been granted yet: review it, link the right school and send the invitation from the request page.', true)}`)
  return { subject, html }
}
