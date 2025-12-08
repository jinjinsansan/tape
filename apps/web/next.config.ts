import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tape/ui", "@tape/supabase", "@tape/rag"]
};

export default nextConfig;
