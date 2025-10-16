/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://uob-track-home-backend.onrender.com',
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  // Ensure styled-jsx works properly
  compiler: {
    styledComponents: true,
  },
  // Handle potential build issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

