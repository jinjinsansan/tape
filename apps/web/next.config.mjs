import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

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
  },
  webpack: (config) => {
    const lodashAliasMap = {
      "lodash/isEqual": "lodash.isequal",
      "lodash/isNil": "lodash.isnil",
      "lodash/isFunction": "lodash.isfunction",
      "lodash/range": "lodash.range"
    };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {})
    };
    for (const [request, target] of Object.entries(lodashAliasMap)) {
      config.resolve.alias[request] = require.resolve(target);
    }
    return config;
  }
};

export default nextConfig;
