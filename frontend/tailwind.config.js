/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#5eead4',
          500: '#34d399',
          600: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
