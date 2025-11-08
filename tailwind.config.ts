import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#7B7EFF",
        "accent-hover": "#646CFF",
        text: "#111827",
        subcopy: "#4B5563",
      },
      textColor: {
        DEFAULT: "#111827",
        secondary: "#4B5563",
        muted: "#9CA3AF",
      },
    },
  },
  plugins: [],
}
export default config
