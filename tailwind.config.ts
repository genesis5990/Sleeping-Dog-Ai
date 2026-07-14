import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Amber accent — warm, calm, distinct from the sea of blue/purple AI products.
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Deep slate surfaces for the dark, infrastructure-tool aesthetic.
        ink: {
          950: "#0a0a0d",
          900: "#0f1115",
          800: "#151821",
          700: "#1c1f2a",
          600: "#262a38",
          500: "#343a4a",
          400: "#4b5263",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(245,158,11,0.15), 0 8px 32px rgba(245,158,11,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
