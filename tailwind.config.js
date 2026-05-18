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

        // Locked UI Colors — wired to CSS variables so they automatically
        // remap when body.light is applied. The hard-coded hex values are
        // retained here as comments for reference. Components using these
        // Tailwind names ("bg-card-bg", "border-card-border", "text-text-secondary",
        // etc.) get light-mode adaptation for free.
        'page-bg': 'var(--bg-page)',          // dark: #0a0e1a, light: #fdfaf6
        'card-bg': 'var(--bg-card)',          // dark: #111827, light: #ffffff
        'card-hover': 'var(--bg-card-hover)', // dark: #131b2c, light: #fbf6ef
        'card-border': 'var(--border-default)', // dark: #1e293b, light: #e8e0d4
        'text-primary': 'var(--text-primary)',     // dark: #fff,    light: #0f1729
        'text-secondary': 'var(--text-secondary)', // dark: #94a3b8, light: #475569
        'text-tertiary': 'var(--text-tertiary)',   // dark: #64748b, light: #64748b
        'text-muted': 'var(--text-muted)',         // dark: #475569, light: #94a3b8

        // Semantic, theme-adapting tokens (preferred for new code).
        // Use these over hardcoded navy-* / gray-* shades so light mode just works.
        'surface-page': 'var(--bg-page)',
        'surface-card': 'var(--bg-card)',
        'surface-card-hover': 'var(--bg-card-hover)',
        'surface-elevated': 'var(--bg-elevated)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'fg-primary': 'var(--text-primary)',
        'fg-secondary': 'var(--text-secondary)',
        'fg-tertiary': 'var(--text-tertiary)',
        'fg-muted': 'var(--text-muted)',
        'accent-crimson': 'var(--crimson)',
        'accent-crimson-fg': 'var(--accent-crimson-fg)',
        'accent-gold': 'var(--accent-gold-readable)',

        // Keep semantic colors constant across all clubs
        'success': '#10b981',
        'danger': '#ef4444',
        'warning': '#f59e0b',

        // Neutrals — navy-950/900 are wired to the semantic page/card tokens
        // so existing `bg-navy-950` / `bg-navy-900` call sites automatically
        // adapt to light mode without a sweeping refactor. The mid/dark
        // shades (800–500) stay hard-coded because they're used for
        // intentional inner-card detailing (hover backgrounds, dividers)
        // where dark-only stylings are still acceptable.
        'navy': {
          950: 'var(--bg-page)',   // page background — adapts to theme
          900: 'var(--bg-card)',   // card background — adapts to theme
          800: 'var(--bg-card-hover)', // hover row / drawer — adapts to theme
          700: 'var(--border-default)', // subtle interactive divider — adapts
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