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
          cream: "#fffaf4",
          beige: "#f7efe6",
          brown: "#51433c",
          "light-brown": "#8b7a71",
          pink: "#d59da9",
          green: "#dbe9df",
          orange: "#f4c4a9",
          lavender: "#e9e4fb",
          blue: "#92b4d6",
          sage: "#e4f0e8",
          sand: "#f5ede4",
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
