import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export configuration for Vercel deployment
  images: {
    domains: ['replicate.delivery', 'otkvdkbqsmrxzxyojlis.supabase.co'],
    unoptimized: false
  },
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

export default nextConfig;
