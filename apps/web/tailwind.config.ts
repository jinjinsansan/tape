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
          cream: "#f9f7f3",
          beige: "#f1ece6",
          brown: "#4b3f3a",
          "light-brown": "#7a6a63",
          pink: "#c68e9b",
          green: "#cbded0",
          orange: "#c69382",
          lavender: "#e6e2f3",
          blue: "#8aa9c8",
          sage: "#d8e3db",
          sand: "#efe7de",
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
