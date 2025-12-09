/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tape/ui", "@tape/supabase", "@tape/rag"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co"
      }
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
