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
          light: '#F8FAFC',
          surface: '#F1F5F9',
          white: '#FFFFFF',
          card: '#FFFFFF',
          cardSubtle: '#F8FAFC',
          border: '#E2E8F0',
          borderSubtle: '#CBD5E1',
          orange: '#FF671F',
          orangeLight: '#FFF7ED',
          orangeBorder: '#FED7AA',
          saffron: '#EA580C',
          green: '#10B981',
          greenLight: '#ECFDF5',
          greenBorder: '#A7F3D0',
          blue: '#0284C7',
          blueLight: '#F0F9FF',
          blueBorder: '#BAE6FD',
          gold: '#D97706',
          goldLight: '#FEF3C7',
          red: '#EF4444',
          redLight: '#FEF2F2',
          navy: '#0F172A',
          text: '#1E293B',
          muted: '#64748B',
        }
      }
    },
  },
  plugins: [],
}

