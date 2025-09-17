import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@octokit/rest'],
  eslint: {
    dirs: ['src', 'components', 'lib', '__tests__'],
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
