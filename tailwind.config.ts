import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#534AB7",
          50: "#EEEDF9",
          100: "#D5D3F1",
          200: "#ABA7E3",
          300: "#817BD5",
          400: "#574FC7",
          500: "#534AB7",
          600: "#3F3892",
          700: "#2C276D",
          800: "#191548",
          900: "#070424",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
