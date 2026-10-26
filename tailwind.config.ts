import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        line: "var(--line)",
        pitch: "var(--pitch)",
        hd: "var(--hd)",
        sig: "var(--sig)",
      },
    },
  },
  plugins: [],
} satisfies Config;