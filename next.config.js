/** @type {import('next').NextConfig} */
const nextConfig = {
  // Comment out 'output: export' for development to support server-side features
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
