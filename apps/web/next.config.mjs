/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tape/ui", "@tape/supabase", "@tape/rag"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co"
      },
      {
        protocol: "https",
        hostname: "ozbajojjxylawffploch.supabase.co"
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net"
      }
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Exclude native modules from webpack bundling (Next.js 14 syntax)
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@napi-rs/canvas"]
  }
};

export default nextConfig;
