/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel handles Next.js natively — no standalone output needed
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
