import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        tape: {
          cream: "#FFFBF5",
          beige: "#F5F2EA",
          brown: "#5C554F",
          "light-brown": "#8E8680",
          pink: "#FFDBCF",
          green: "#CBE4D6",
          orange: "#F2A490",
        },
      },
      fontFamily: {
        sans: ["var(--font-zen-maru)", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    }
  },
  plugins: []
};

export default config;
