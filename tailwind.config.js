/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NAFFCO brand red — used as the primary accent across the portal.
        brand: {
          50:  '#fdf3f3',
          100: '#fce4e5',
          200: '#facccf',
          300: '#f5a3a8',
          400: '#ee6b73',
          500: '#e23b45',
          600: '#cf1f29',
          700: '#ad1a22',
          800: '#8f1a20',
          900: '#771b20',
          950: '#41090c',
        },
        // Charcoal / neutral scale for backgrounds, surfaces, and text.
        charcoal: {
          50:  '#f6f7f8',
          100: '#eceef0',
          200: '#d6dade',
          300: '#b1b8bf',
          400: '#86909a',
          500: '#67727d',
          600: '#515a64',
          700: '#434a52',
          800: '#2b3036',
          900: '#1d2125',
          950: '#121417',
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
