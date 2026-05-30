/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles everything needed for deployment
  // (resolves workspace packages — no monorepo needed on the server)
  output: 'standalone',
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
