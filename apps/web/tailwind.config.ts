import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: "#0A0B0D",
        deep: "#0F1115",
        surface: "#161820",
        panel: "#1D1F28",
        accent: "#E8FF47",
        orange: "#FF6B2B",
        green: "#34D399",
        muted: "#7A7E8A",
        blue: "#3B82F6",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        btn: "8px",
        card: "12px",
        panel: "16px",
        modal: "20px",
      },
      backgroundImage: {
        "accent-glow": "radial-gradient(60% 60% at 50% 30%, rgba(232,255,71,0.25), transparent 70%)",
      },
      boxShadow: {
        glow: "0 0 60px rgba(232,255,71,0.18)",
      },
      letterSpacing: {
        tightest: "-0.04em",
        "display-tight": "-0.03em",
      },
    },
  },
  plugins: [],
} satisfies Config;
