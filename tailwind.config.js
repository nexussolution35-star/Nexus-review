/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A2540",
        sub: "#425466",
        faint: "#8792A2",
        line: "#E3E8EE",
        surface: "#FFFFFF",
        canvas: "#F6F9FC",
        good: "#217005",
        goodsoft: "#D7F7C2",
        bad: "#DF1B41",
        badsoft: "#FFE7EB",
        accent: "#635BFF",
        accentsoft: "#EEEDFF",
        warn: "#C84801",
        warnsoft: "#FCEDB9",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
