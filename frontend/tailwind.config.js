/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#462C7D", strong: "#35205F", soft: "#EEE9F7" },
        gold: { DEFAULT: "#462C7D", lt: "#5D3E99", dk: "#35205F", pale: "#EEE9F7" },
        plum: {
          950: "#35205F", 900: "#462C7D", 800: "#5D3E99", 700: "#FFFFFF",
          600: "#F7F4FB", 500: "#EEE9F7", 400: "#CFC4E2", 300: "#AAA2BA",
          200: "#6F6B78", 100: "#F7F7FA", 50: "#FFFFFF",
        },
        success: "#18794E", danger: "#B42318", warning: "#A15C00", info: "#3559A8",
        neutral: {
          50: "#FAFAFB", 100: "#F4F4F6", 200: "#E8E6ED", 300: "#D2CFD8",
          400: "#AAA6B0", 500: "#817C89", 600: "#6F6B78", 700: "#4C4853",
          800: "#2D2933", 900: "#17151D",
        },
      },
      fontFamily: {
        display: ["Google Sans", "Google Sans Text", "Arial", "sans-serif"],
        body: ["Google Sans", "Google Sans Text", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,21,29,0.04), 0 5px 18px rgba(23,21,29,0.05)",
        "card-md": "0 10px 26px rgba(23,21,29,0.08)",
        "card-lg": "0 14px 36px rgba(23,21,29,0.10)",
        "gold-glow": "0 8px 18px rgba(70,44,125,0.18)",
      },
      borderRadius: { card: "16px" },
    },
  },
  plugins: [],
};
