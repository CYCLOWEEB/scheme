import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ['motion'],
};

export default nextConfig;
