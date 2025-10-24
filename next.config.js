/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://uob-track-home-backend.onrender.com',
  },
  images: {
    domains: ['localhost', 'api.qrserver.com'],
    unoptimized: true,
  },
  // styled-jsx is built into Next.js by default
  // Handle potential build issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Experimental features removed to avoid build issues
};

module.exports = nextConfig;

