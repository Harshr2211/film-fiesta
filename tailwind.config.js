/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  darkMode: 'selector',
  theme: {
    extend: {
      colors: {   
        primary: {
          100: '#EADFC3',
          200: '#DFD0A4',
          300: '#DAC895',
          400: '#D5C086',
          500: '#CFB877',
          600: '#CAB068',
          700: '#C5A859',
          800: '#BE9E44',
          900: '#B59640',
          1000: '#977D35'
        }
      }
    },
  },
  plugins: [],
}

