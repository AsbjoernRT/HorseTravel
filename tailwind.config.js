/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#002300',
        secondary: '#d6d1ca',
        background: '#002300',
        text: '#ffffff',
      },
    },
  },
  plugins: [],
}

