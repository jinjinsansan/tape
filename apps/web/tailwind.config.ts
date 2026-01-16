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
          cream: "#fff8ee",
          beige: "#ffe7d0",
          brown: "#5f3b1f",
          "light-brown": "#b06a3b",
          pink: "#ffb689",
          green: "#fff1df",
          orange: "#ff8a3c",
          lavender: "#ffe3c7",
          blue: "#ffd8b5",
          sage: "#fff0e0",
          sand: "#ffe9d8",
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
