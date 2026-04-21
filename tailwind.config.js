/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f0f2f7',
        bg2: '#e6e9f2',
        surface: '#fff',
        surface2: '#f7f8fc',
        surface3: '#eef0f8',
        border: '#dde1ee',
        border2: '#c8cfe3',
        ink: '#1a1d2e',
        ink2: '#4a5068',
        ink3: '#8891a8',
        blue: { DEFAULT: '#2563eb', 2: '#1d4ed8', soft: '#eff4ff', glow: 'rgba(37,99,235,.12)' },
        green: { DEFAULT: '#059669', soft: '#ecfdf5' },
        amber: { DEFAULT: '#d97706', soft: '#fffbeb' },
        red: { DEFAULT: '#dc2626', soft: '#fef2f2' },
        purple: { DEFAULT: '#7c3aed', soft: '#f5f3ff' },
        gold: { DEFAULT: '#f59e0b', 2: '#d97706' },
      },
      borderRadius: {
        'r': '10px',
        'r2': '16px',
      },
      boxShadow: {
        'sh': '0 1px 3px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.05)',
        'sh2': '0 4px 24px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.06)',
        'sh3': '0 12px 48px rgba(0,0,0,.14)',
      },
      fontFamily: {
        lato: ['Lato', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        vIn: {
          from: { opacity: 0, transform: 'translateY(7px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        orbPulse: {
          '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.1)' },
        },
        driveBy: {
          'from': { left: '-60px', opacity: 0 },
          '5%': { opacity: 1 },
          '95%': { opacity: 1 },
          'to': { left: 'calc(100% + 60px)', opacity: 0 },
        },
        blink: {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 1 },
        },
        cp: {
          'from': { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
          'to': { opacity: 1, transform: 'scale(1) translateY(0)' },
        }
      },
      animation: {
        vIn: 'vIn 0.3s ease',
        orbPulse: 'orbPulse 8s ease-in-out infinite',
        driveBy: 'driveBy linear infinite',
        blink: 'blink 0.8s ease-in-out infinite',
        cp: 'cp 0.35s cubic-bezier(0.16,1,0.3,1) both',
      }
    },
  },
  plugins: [],
}
