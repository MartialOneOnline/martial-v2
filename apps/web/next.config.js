/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable router cache so protected pages never serve a stale redirect-to-login
    staleTimes: { dynamic: 0 },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'fixipigqxebxferfxlsv.supabase.co' },
    ],
    // Link-preview crawlers (WhatsApp, iMessage) need og:image served inline —
    // the default 'attachment' disposition makes them skip the image.
    contentDispositionType: 'inline',
  },
}

export default nextConfig
