import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Remove basePath and assetPrefix for local testing
  // basePath: process.env.NODE_ENV === 'production' ? '/entity' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/entity/' : '',
};

export default nextConfig;
