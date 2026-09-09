import type { Config } from "tailwindcss"
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0d1117",
        surface: "#161b22",
        border:  "#30363d",
        primary: "#e6edf3",
        muted:   "#8b949e",
        accent:  "#2f81f7",
        success: "#3fb950",
        warning: "#d29922",
        danger:  "#f85149",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
export default config
