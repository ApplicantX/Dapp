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
          950: '#0c0217',
          900: '#1a0438',
          850: '#220646',
          800: '#2e085c',
          750: '#380c6e',
          700: '#461187',
          600: '#5e1ba8',
          500: '#7e22ce',
          400: '#a855f7',
          300: '#c084fc',
          200: '#e9d5ff',
          100: '#f3e8ff',
          50: '#faf5ff',
        },
        gold: {
          950: '#451a03',
          900: '#78350f',
          800: '#92400e',
          700: '#b45309',
          600: '#d97706',
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fef08a',
          100: '#fef9c3',
          50: '#fffbeb',
        },
        silver: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(245, 158, 11, 0.45)',
        'purple-glow': '0 0 35px -5px rgba(126, 34, 206, 0.55)',
        'royal': '0 20px 40px -15px rgba(15, 2, 31, 0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
