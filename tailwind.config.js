/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Club-themed colors (CSS variables)
        'club-primary': 'var(--club-primary)',
        'club-secondary': 'var(--club-secondary)',
        'club-dark': 'var(--club-neutral-dark)',

        // Generated lighter/darker shades — use color-mix
        'club-primary-light': 'color-mix(in srgb, var(--club-primary) 80%, white)',
        'club-primary-dark': 'color-mix(in srgb, var(--club-primary) 80%, black)',
        'club-secondary-light': 'color-mix(in srgb, var(--club-secondary) 80%, white)',
        'club-secondary-dark': 'color-mix(in srgb, var(--club-secondary) 80%, black)',

        // Eastside FC Brand Colors - Locked Design Language
        'eastside-crimson': '#C8102E',
        'eastside-navy': '#1B2A4A',
        'eastside-gold': '#fbbf24',

        // Locked UI Colors
        'page-bg': '#0a0e1a',
        'card-bg': '#111827',
        'card-hover': '#131b2c',
        'card-border': '#1e293b',
        'text-primary': '#ffffff',
        'text-secondary': '#94a3b8',
        'text-tertiary': '#64748b',
        'text-muted': '#475569',

        // Keep semantic colors constant across all clubs
        'success': '#10b981',
        'danger': '#ef4444',
        'warning': '#f59e0b',

        // Neutrals (dark mode primary, light mode alternatives)
        'navy': {
          950: '#0a0e1a', // page background
          900: '#0a0e1a',  // cards in dark mode
          800: '#1a1f2e',
          700: '#232938',
          600: '#334155',
          500: '#475569'
        },

        // Light mode alternatives
        'light': {
          50: '#f8fafc',   // page background in light mode
          100: '#f1f5f9',  // cards in light mode
          200: '#e2e8f0',
          300: '#cbd5e1'
        },

        // Keep crimson aliases for now — Phase 2 will replace these
        'crimson': {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c'
        },

        // Legacy colors - kept for compatibility
        card: '#0f1e36',
        border: 'rgba(220, 38, 38, 0.15)',
      },
    },
  },
  plugins: [],
}