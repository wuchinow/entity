/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;