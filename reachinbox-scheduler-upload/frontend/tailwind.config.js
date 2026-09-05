/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E1A",
          900: "#10152B",
          800: "#171D33",
          700: "#202748",
          600: "#2A3151",
          500: "#3A4370",
        },
        mist: {
          400: "#7C86A6",
          200: "#C4CAE0",
          50: "#EDEFF7",
        },
        signal: {
          DEFAULT: "#6C8CFF",
          soft: "#3D4A85",
        },
        sent: "#3ED7A4",
        deferred: "#F2B84B",
        failed: "#F2635B",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};
