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
        surface: "#F2F4F8",
        primary: "#1A1C1E",
        accent: "#005FB8",
        "accent-hover": "#004A94",
      },
    },
  },
  plugins: [],
};

export default config;
