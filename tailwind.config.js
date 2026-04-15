/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0a1a',
          800: '#11112b',
          700: '#1a1a3a',
        },
        accent: {
          glow: '#00f2fe',
          neon: '#7000ff',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
        'space-gradient': 'radial-gradient(circle at top right, #1a1a3a, #0a0a1a)',
      },
      boxShadow: {
        'neon-glow': '0 0 15px rgba(0, 242, 254, 0.4)',
        'accent-glow': '0 0 15px rgba(112, 0, 255, 0.4)',
      }
    },
  },
  plugins: [],
}
