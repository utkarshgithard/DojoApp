/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', 
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}", // <- for shadcn components

  ]
  ,
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out'
      }, 
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        }
      }
    },
  },
  plugins: [],
}

