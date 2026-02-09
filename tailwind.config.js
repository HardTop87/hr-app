/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cococo: {
          peach: '#FFEFF8',
          pig: '#FF79C9',
          berry: '#4D2B41',
          moss: '#1E4947',
        },
      },
      fontFamily: {
        sans: ['"Sofia Sans"', ...defaultTheme.fontFamily.sans],
        condensed: ['"Sofia Sans Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}