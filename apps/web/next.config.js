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
  },
}

export default nextConfig
