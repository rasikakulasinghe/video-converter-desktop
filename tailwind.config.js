/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'segoe': ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0078D4',
        'primary-hover': '#106ebe',
        secondary: '#6C757D',
        success: '#28A745',
        error: '#DC3545',
        dark: {
          100: '#f8f9fa',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        }
      },
    },
  },
  plugins: [],
  darkMode: 'media', // Use system preference
}