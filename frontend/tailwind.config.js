/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Gold accent — primary interactive color
        gold: {
          DEFAULT: "#C9A84C",
          lt: "#E8C96D",
          dk: "#A8872E",
          pale: "#F5E9C4",
        },
        // Deep plum — backgrounds, sidebar, surfaces
        plum: {
          950: "#0D0820",
          900: "#120B22",
          800: "#1A0F2E",
          700: "#1E1235",
          600: "#261748",
          500: "#2D1B4E",
          400: "#3D2A64",
          300: "#5A4870",
          200: "#9080A8",
          100: "#F2EEF8",
          50: "#F8F5FC",
        },
        // Semantic
        success: "#3DBD87",
        danger: "#E05252",
        warning: "#E8A94C",
        info: "#6B9FE8",

        // Keep a neutral scale for text/borders
        neutral: {
          50: "#fafaf7",
          100: "#f4f2ec",
          200: "#e8e4d9",
          300: "#d6d0c0",
          400: "#b8af99",
          500: "#948a73",
          600: "#756b58",
          700: "#5c5443",
          800: "#3d3830",
          900: "#252118",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.35)",
        "card-md": "0 4px 24px rgba(0,0,0,0.45)",
        "card-lg": "0 8px 40px rgba(0,0,0,0.60)",
        "gold-glow": "0 4px 16px rgba(201,168,76,0.30)",
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
