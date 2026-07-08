export const FALLBACK_OG_IMAGE = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200&h=630&fit=crop&q=85'

const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://martial-v2-web.vercel.app'
export const APP_URL = /^https?:\/\//.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`

// Raw uploads can be several MB — WhatsApp/iMessage link-preview crawlers time
// out or skip the image above ~1MB, so route uploaded covers through the
// image optimizer to get a small, correctly-sized JPEG for og:image.
export function ogImageUrl(rawUrl: string | null | undefined): string {
  return rawUrl
    ? `${APP_URL}/_next/image?url=${encodeURIComponent(rawUrl)}&w=1200&q=75`
    : FALLBACK_OG_IMAGE
}
