/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://uob-track-home-backend.onrender.com',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://uob-track-home-backend.onrender.com'}/api/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;

