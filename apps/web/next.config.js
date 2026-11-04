/** @type {import('next').NextConfig} */
const nextConfig = {
  // www.martialapp.com used to serve the whole app as a second origin with
  // its own cookie jar: a session started on one host didn't exist on the
  // other, and OAuth round trips (Apple/Microsoft via Supabase, Google GSI)
  // only allow-list the apex domain, so sign-ins started on www bounced to a
  // different host and failed.
  //
  // Webhooks and crons are left alone on www: a provider registered against
  // www (Stripe, Revolut, Mux…) may refuse to follow a redirect even when it
  // keeps the method, so they're served on www exactly as before.
  async redirects() {
    return [
      {
        source: '/:path((?!api/webhooks(?:/|$)|api/cron(?:/|$)).*)',
        has: [{ type: 'host', value: 'www.martialapp.com' }],
        destination: 'https://martialapp.com/:path*',
        permanent: true,
      },
    ]
  },
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
