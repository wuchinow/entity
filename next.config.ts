import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export configuration for Vercel deployment
  images: {
    domains: ['replicate.delivery', 'otkvdkbqsmrxzxyojlis.supabase.co'],
    unoptimized: false
  },
  // Fix deprecated experimental config
  serverExternalPackages: ['@supabase/supabase-js'],
  // Disable ESLint and TypeScript checking during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
