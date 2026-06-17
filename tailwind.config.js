/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#FF4F93',
        'primary-deep': '#DB2777',
        ink: '#2A1B2E',
        'ink-soft': '#8B7280',
        border: '#EAEAEA',
        destructive: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
      },
      borderRadius: {
        '2xl': '24px',
      },
      fontFamily: {
        sans: ['Manrope'],
        display: ['Fraunces'],
      },
    },
  },
  plugins: [],
};
