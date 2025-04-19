/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // We rely on toggling .dark on <html>
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./component/**/*.{js,ts,jsx,tsx}",
    "./module-5/nextjs-project/**/*.{js,ts,jsx,tsx}",

    // ...
  ],
  theme: {
    extend: {
      // Optional: add custom transitions, keyframes, or colors
      colors: {
        "brand-purple": "#6f42c1",
        "brand-pink": "#ff63c6",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.05) 0%, transparent 50%)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.8s ease forwards",
      },
    },
  },
  plugins: [],
};
