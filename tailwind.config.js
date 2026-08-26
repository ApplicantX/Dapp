/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          950: '#0a0114',
          900: '#130324',
          850: '#1b0630',
          800: '#260a43',
          750: '#321056',
          700: '#41176e',
          600: '#5a2095',
          500: '#7b2cbf',
          400: '#9d4edd',
          300: '#c77dff',
          200: '#e0aaff',
          100: '#f3e8ff',
          50: '#faf5ff',
        },
        gold: {
          950: '#3a2800',
          900: '#5c4103',
          800: '#7e5a07',
          700: '#a3760d',
          600: '#c59217',
          500: '#d4af37',
          400: '#e3c25b',
          300: '#f0d686',
          200: '#faeab4',
          100: '#fdf5dc',
          50: '#fffbf0',
        },
        surface: {
          base: '#0a0114',
          container: '#130324',
          elevated: '#1c0733',
          high: '#270c46',
          border: 'rgba(157, 78, 221, 0.15)',
          goldBorder: 'rgba(212, 175, 55, 0.28)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Google Sans"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'card-hover': '0 12px 32px -4px rgba(0, 0, 0, 0.55), 0 0 20px rgba(212, 175, 55, 0.12)',
        'gold-glow': '0 0 24px -2px rgba(212, 175, 55, 0.35)',
        'purple-glow': '0 0 30px -4px rgba(123, 44, 191, 0.35)',
        'modal': '0 25px 60px -15px rgba(0, 0, 0, 0.75)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
