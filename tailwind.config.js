/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#D4AF37"
        },
        surface: {
          DEFAULT: "var(--bg-surface)"
        },
        foreground: {
          DEFAULT: "var(--fg)"
        },
        "muted-foreground": {
          DEFAULT: "var(--muted)"
        },
        card: {
          DEFAULT: "var(--card-bg)"
        },
      },
    },
  },
  plugins: [],
}
