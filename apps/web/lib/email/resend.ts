import { Resend } from 'resend'

export const FROM = 'Martial <notifications@martialapp.com>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'

// Lazy — only instantiated when actually sending, not at build time
export function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}
