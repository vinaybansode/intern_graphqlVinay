import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b6fd4",
          600: "#2f59ad",
          700: "#264a90",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
