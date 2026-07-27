/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf6ee",
          100: "#f9e8d0",
          200: "#f3ce9e",
          300: "#ebae65",
          400: "#e2923a",
          500: "#c97a28",   // Primary — warm amber
          600: "#a86020",
          700: "#87491a",
          800: "#6e3b18",
          900: "#5c3117",
        },
        neutral: {
          50:  "#fafaf7",
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
        display: ["Georgia", "Cambria", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
