/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12100e",
        panel: "#1d1915",
        line: "#493d31",
        lime: "#d9b36c",
        cyan: "#eadcc5",
      },
      boxShadow: { glow: "0 0 30px rgba(217,179,108,.2)" },
    },
  },
  plugins: [],
};
