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
        sans: [
          "var(--font-zen-maru)",
          "Zen Maru Gothic",
          "Hiragino Sans",
          "Yu Gothic",
          "sans-serif"
        ],
        serif: [
          "var(--font-shippori)",
          "Shippori Mincho",
          "Yu Mincho",
          "serif"
        ]
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "sway-gentle": {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        "sway-medium": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        "leaf-rustle": {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "50%": { transform: "scale(1.05) rotate(2deg)" },
        },
        "float-particle": {
          "0%, 100%": { transform: "translateY(0) opacity(0.4)" },
          "50%": { transform: "translateY(-5px) opacity(0.8)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.4" },
        }
      },
      animation: {
        "sway-slow": "sway-gentle 6s ease-in-out infinite",
        "sway-medium": "sway-medium 5s ease-in-out infinite",
        "leaf-breathe": "leaf-rustle 4s ease-in-out infinite",
        "sparkle": "float-particle 3s ease-in-out infinite",
        "glow": "pulse-glow 4s ease-in-out infinite",
      }
    }
  },
  plugins: []
};

export default config;
