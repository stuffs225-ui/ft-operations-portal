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
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c2d4ff',
          300: '#93b4ff',
          400: '#6090ff',
          500: '#3b6ef6',
          600: '#1e4de8',
          700: '#1a3ecf',
          800: '#1c35a8',
          900: '#1c3185',
          950: '#141f52',
        },
        slate: {
          925: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
