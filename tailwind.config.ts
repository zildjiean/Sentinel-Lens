import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#131317",
          bright: "#39393d",
          tint: "#bbc6e2",
          container: {
            lowest: "#0e0e12",
            low: "#1b1b1f",
            DEFAULT: "#1f1f23",
            high: "#2a2a2e",
            highest: "#353439",
          },
        },
        "on-surface": {
          DEFAULT: "#e4e1e7",
          variant: "#c4c6cc",
        },
        primary: {
          DEFAULT: "#bbc6e2",
          container: "#0f1a2e",
        },
        secondary: {
          DEFAULT: "#4ae183",
          container: "#06bb63",
        },
        tertiary: {
          DEFAULT: "#ffb783",
          container: "#2e1300",
        },
        error: {
          DEFAULT: "#ffb4ab",
          container: "#93000a",
        },
        outline: {
          DEFAULT: "#8e9196",
          variant: "#44474c",
        },
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
