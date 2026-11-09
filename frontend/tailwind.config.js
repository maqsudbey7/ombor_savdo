/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#eef4ff', 100: '#dae6ff', 200: '#bdd2ff', 300: '#90b4ff', 400: '#5c8bfd', 500: '#3763f9', 600: '#2145ee', 700: '#1a35db', 800: '#1c2eb1', 900: '#1d2d8b' },
        ink: { 900: '#0b1020', 950: '#070a16' },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(16 24 40 / .04), 0 6px 20px -6px rgb(16 24 40 / .10)',
        glow: '0 10px 40px -10px rgb(55 99 249 / .55)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        grid: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '40px 40px' } },
        pulsering: { '0%': { transform: 'scale(.8)', opacity: '.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        grid: 'grid 3s linear infinite',
        pulsering: 'pulsering 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
