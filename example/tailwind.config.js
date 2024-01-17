/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    // require("../src/index")({ // <- can be used for development while in the tailwind-grid-container package
    require("tailwind-grid-container")({
      baseName: 'container-base',
      padding: 20,
      // padding: {
      //   DEFAULT: 10,
      //   sm: 10,
      //   lg: 20,
      //   xl: 40,
      //   '2xl': 60,
      // },
      // screens: 400,
      screens: {
        // DEFAULT: 400,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        "2xl": 1536,
      },
      subContainers: {
        // feature: 600
        feature: {
          DEFAULT: 500,
          sm: 740,
          md: 868,
          lg: 1124,
          xl: 1380,
          "2xl": 1636,
        },
      },
    }),
  ],
};
