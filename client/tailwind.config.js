/** @type {import('tailwindcss').Config} */
import lightswind from "lightswind/plugin";

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/lightswind/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false, // keep Bootstrap styles intact during migration
  },
  plugins: [lightswind],
};


