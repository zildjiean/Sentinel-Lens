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
          DEFAULT: "var(--color-surface)",
          bright: "var(--color-surface-bright)",
          tint: "var(--color-surface-tint)",
          container: {
            lowest: "var(--color-surface-container-lowest)",
            low: "var(--color-surface-container-low)",
            DEFAULT: "var(--color-surface-container)",
            high: "var(--color-surface-container-high)",
            highest: "var(--color-surface-container-highest)",
          },
        },
        "on-surface": {
          DEFAULT: "var(--color-on-surface)",
          variant: "var(--color-on-surface-variant)",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          container: "var(--color-primary-container)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          container: "var(--color-secondary-container)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          container: "var(--color-tertiary-container)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          container: "var(--color-error-container)",
        },
        outline: {
          DEFAULT: "var(--color-outline)",
          variant: "var(--color-outline-variant)",
        },
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        full: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
