/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-main":   "#12100e",
        "bg-card":   "#1c1916",
        "bg-input":  "#252119",
        "cream":     "#ede0c4",
        "cream-muted": "#a89880",
        "accent":    "#e8621a",
        /* Statuts plan de salle */
        "table-free":     "#22c55e",
        "table-pending":  "#f59e0b",
        "table-reserved": "#ef4444",
        "table-small":    "#6b7280",
      },
      fontFamily: {
        title: ["'Bebas Neue'", "sans-serif"],
        body:  ["'Manrope'", "sans-serif"],
      },
      screens: {
        /* Identiques aux defaults Tailwind — rappel ordre mobile-first */
        // 375px → défaut (mobile)
        // sm: 640px → grand mobile
        // md: 768px → tablette
        // lg: 1024px → desktop
      },
    },
  },
  plugins: [],
};
