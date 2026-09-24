/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  "#f4f6fa",
          100: "#e7ebf3",
          200: "#cdd6e6",
          300: "#a9b8d1",
          400: "#7c8fb3",
          500: "#5a6f96",
          600: "#445577",
          700: "#2f3d5c",
          800: "#1c2740",
          850: "#141d33",
          900: "#0f1729",
          950: "#060a14",
        },
        signal: {
          cyan: "#22d3ee",
          red: "#f43f5e",
          amber: "#f59e0b",
        },
      },
      borderRadius: {
        xl2: "1.125rem",
      },
      boxShadow: {
        panel: "0 8px 24px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.02)",
      },
    },
  },
  plugins: [],
};
