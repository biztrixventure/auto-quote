import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: "#262A30",
        road: "#3A4049",
        line: "#F2C230",
        sky: "#1F5FAD",
        mist: "#EEF1F4",
        rail: "#D5DBE1",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
