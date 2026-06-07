/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        muted: '#647084',
        brand: {
          50: '#eef8ff',
          100: '#d9efff',
          500: '#1677ff',
          600: '#0f63d9',
          700: '#0f4faf',
        },
        coral: '#f9735b',
        mint: '#13b981',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(24, 39, 75, 0.10)',
      },
    },
  },
  plugins: [],
};
