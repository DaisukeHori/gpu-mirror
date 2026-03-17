import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@revol-mirror/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
