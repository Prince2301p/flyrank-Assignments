/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        panel: "var(--panel)",
        node: {
          bg: "var(--node-bg)",
          border: "var(--node-border)",
        },
        decision: {
          yes: "#10b981",
          no: "#f43f5e",
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-yes': 'glowYes 2s ease-in-out infinite',
        'glow-no': 'glowNo 2s ease-in-out infinite',
      },
      keyframes: {
        glowYes: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.1)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.6), 0 0 50px rgba(16, 185, 129, 0.3)' },
        },
        glowNo: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(244, 63, 94, 0.3), 0 0 30px rgba(244, 63, 94, 0.1)' },
          '50%': { boxShadow: '0 0 25px rgba(244, 63, 94, 0.6), 0 0 50px rgba(244, 63, 94, 0.3)' },
        }
      }
    },
  },
  plugins: [],
};
