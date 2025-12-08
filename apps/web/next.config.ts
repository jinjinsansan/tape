import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(process.cwd());

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

const nextConfig: NextConfig = {
  transpilePackages: ["@tape/ui", "@tape/supabase", "@tape/rag"]
};

export default nextConfig;
