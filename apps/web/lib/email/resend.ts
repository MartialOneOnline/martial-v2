import { Resend } from 'resend'

// Initialise once — will throw at send time if key is missing, not at boot
export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM = 'Martial <notifications@martialapp.com>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'
