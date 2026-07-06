import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#e8ecff",
          200: "#c9d3ff",
          300: "#a3b3ff",
          400: "#7c8dff",
          500: "#5468f2",
          600: "#4150cf",
          700: "#333fa8",
          800: "#2a3480",
          900: "#232b63",
        },
      },
      backgroundImage: {
        checkerboard:
          "linear-gradient(45deg, #d9d9d9 25%, transparent 25%), linear-gradient(-45deg, #d9d9d9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d9d9d9 75%), linear-gradient(-45deg, transparent 75%, #d9d9d9 75%)",
        "checkerboard-dark":
          "linear-gradient(45deg, #3a3a3a 25%, transparent 25%), linear-gradient(-45deg, #3a3a3a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3a3a3a 75%), linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)",
      },
      backgroundSize: {
        checker: "20px 20px",
      },
      backgroundPosition: {
        checker: "0 0, 0 10px, 10px -10px, -10px 0px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
