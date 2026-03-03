import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Custom cosmic colors
        cosmic: {
          gold: "hsl(var(--cosmic-gold))",
          glow: "hsl(var(--cosmic-glow))",
          pink: "hsl(var(--nebula-pink))",
        },
        tier: {
          1: "hsl(var(--tier-1))",
          2: "hsl(var(--tier-2))",
          3: "hsl(var(--tier-3))",
          4: "hsl(var(--tier-4))",
          5: "hsl(var(--tier-5))",
          6: "hsl(var(--tier-6))",
          7: "hsl(var(--tier-7))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "combat-pulse-red": {
          "0%, 100%": { boxShadow: "inset 0 0 0 2px rgba(239, 68, 68, 0.3), 0 0 15px rgba(239, 68, 68, 0.1)" },
          "50%": { boxShadow: "inset 0 0 0 2px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.3)" },
        },
        "combat-pulse-green": {
          "0%, 100%": { boxShadow: "inset 0 0 0 2px rgba(34, 197, 94, 0.3), 0 0 15px rgba(34, 197, 94, 0.1)" },
          "50%": { boxShadow: "inset 0 0 0 2px rgba(34, 197, 94, 0.7), 0 0 30px rgba(34, 197, 94, 0.3)" },
        },
        "ripple-1": {
          "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0.6" },
          "100%": { transform: "translate(-50%, -50%) scale(15)", opacity: "0" },
        },
        "ripple-2": {
          "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0.4" },
          "100%": { transform: "translate(-50%, -50%) scale(20)", opacity: "0" },
        },
        "ripple-3": {
          "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0.2" },
          "100%": { transform: "translate(-50%, -50%) scale(25)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
        "ripple-1": "ripple-1 1.5s ease-out forwards",
        "ripple-2": "ripple-2 1.5s ease-out 0.2s forwards",
        "ripple-3": "ripple-3 1.5s ease-out 0.4s forwards",
        "combat-pulse-red": "combat-pulse-red 1.2s ease-in-out infinite",
        "combat-pulse-green": "combat-pulse-green 1.2s ease-in-out infinite",
      },
      backgroundImage: {
        "cosmic-radial": "radial-gradient(ellipse at center, hsl(270 30% 15%) 0%, hsl(240 20% 4%) 70%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
