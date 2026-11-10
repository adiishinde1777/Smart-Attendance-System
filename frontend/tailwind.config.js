/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#e1e9f2',
          200: '#c3d3e6',
          300: '#95b3d4',
          400: '#608dc0',
          500: '#3c6ea9',
          600: '#2b548b',
          700: '#234471',
          800: '#1e385c',
          900: '#0f172a', // Deep navy
          950: '#0a0f1d'
        },
        accent: {
          teal: '#06b6d4',
          emerald: '#10b981',
          indigo: '#6366f1',
          amber: '#f59e0b',
          rose: '#f43f5e'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
