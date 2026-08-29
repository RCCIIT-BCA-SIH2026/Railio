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
          white: '#FFFFFF',
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#64748B',
          orange: '#FF671F',
          saffron: '#F97316',
          green: '#10B981',
          gold: '#F59E0B',
          red: '#EF4444',
          blue: '#0EA5E9'
        }
      }
    },
  },
  plugins: [],
}
