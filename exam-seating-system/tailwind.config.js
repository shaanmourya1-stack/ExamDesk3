/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc0fb',
          400: '#369ef7',
          500: '#0c80eb',
          600: '#0064c9',
          700: '#014fa3',
          800: '#064486',
          900: '#0b396f',
        }
      }
    },
  },
  plugins: [],
}
