/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1118",
        panel: "#111a24",
        line: "#243343",
        lime: "#b7f34a",
        cyan: "#5ee7f7",
      },
      boxShadow: { glow: "0 0 30px rgba(183,243,74,.12)" },
    },
  },
  plugins: [],
};
