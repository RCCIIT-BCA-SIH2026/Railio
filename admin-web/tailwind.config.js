/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        rail: {
          dark: '#07162c',
          navy: '#0B2545',
          card: '#132F56',
          border: '#1E4273',
          orange: '#FF671F',
          saffron: '#FF7722',
          green: '#10B981',
          gold: '#F59E0B',
          red: '#EF4444',
          cyan: '#06B6D4'
        }
      }
    },
  },
  plugins: [],
}
