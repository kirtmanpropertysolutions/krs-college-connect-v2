import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/authContext'
import { ThemeContext } from './themeContext'

const DEFAULT_THEME = {
  primary: '#dc2626',
  secondary: '#fbbf24',
  neutralDark: '#0a0e1a',
  logoUrl: null
}

// localStorage key that holds the user's last-chosen color mode.
// Persisted client-side (not just in DB) so the page can paint the
// right body class on first render, before the auth/profile load
// resolves — that's what kills the dark-to-light flash on reload.
const COLOR_MODE_STORAGE_KEY = 'krs_color_mode'

/**
 * Pick the initial color mode synchronously, BEFORE first render.
 * Priority: localStorage > 'dark' fallback.
 * (Profile preference is layered in via useEffect once auth loads.)
 *
 * Dark mode is the brand default and the default for every new visitor.
 * We deliberately do NOT honor `prefers-color-scheme` on first visit —
 * users opt into light mode explicitly via the toggle. This keeps the
 * brand-correct dark dashboard as the entrypoint for everyone.
 *
 * Also applies the body class immediately as a side-effect of this
 * lazy initializer — yes, side-effects in a useState initializer is
 * not pure, but it's the standard React no-flicker pattern: the body
 * class needs to be on the DOM before paint, and effects run AFTER
 * paint. Without this, light-mode users see a dark frame on every
 * reload.
 */
function getInitialColorMode() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved
    }
  } catch {
    /* private mode / disabled storage — fall through */
  }
  // No saved preference — default to dark. Brand-correct entrypoint
  // for every new visitor and every fresh device.
  return 'dark'
}

// Apply body class IMMEDIATELY at module load, before React even mounts.
// This is what avoids the flash-of-dark-mode on light-mode reloads.
// We re-apply it inside the effect below too (handles auth/profile
// updates), but doing it here once upfront catches the critical
// first-paint window.
if (typeof document !== 'undefined') {
  const initial = getInitialColorMode()
  const resolved =
    initial === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : initial
  document.body.classList.remove('light', 'dark')
  document.body.classList.add(resolved)
}

export function ThemeProvider({ children }) {
  const { user, profile } = useAuth()
  const [theme, setTheme] = useState(DEFAULT_THEME)
  // Lazy initializer — runs once at mount, picks up localStorage so
  // there's no flash before the auth-derived preference loads.
  const [colorMode, setColorModeState] = useState(getInitialColorMode)

  // Setter wrapper — persists to localStorage on every change so the
  // next reload paints the right mode before React hydrates. Callers
  // (ColorModeToggle) still do the DB write separately.
  const setColorMode = (next) => {
    setColorModeState(next)
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next)
    } catch {
      /* private mode — soft fail; the React state still tracks it */
    }
  }

  useEffect(() => {
    if (!user || !profile?.org_id) return

    async function loadTheme() {
      const { data: org } = await supabase
        .from('organizations')
        .select('theme_primary, theme_secondary, theme_neutral_dark, theme_logo_url, theme_logo_dark_url')
        .eq('id', profile.org_id)
        .single()

      if (org) {
        setTheme({
          primary: org.theme_primary || DEFAULT_THEME.primary,
          secondary: org.theme_secondary || DEFAULT_THEME.secondary,
          neutralDark: org.theme_neutral_dark || DEFAULT_THEME.neutralDark,
          logoUrl: org.theme_logo_url
        })
      }

      // Only adopt the server-side preference if the client didn't already
      // have a localStorage choice. The toggle is the source of truth
      // post-mount; the DB value is a slow-path fallback for new devices.
      let hasLocal = false
      try {
        hasLocal = Boolean(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY))
      } catch {
        hasLocal = false
      }
      if (!hasLocal && profile.color_mode) {
        setColorMode(profile.color_mode)
      }
    }

    loadTheme()
  }, [user, profile])

  // Apply CSS custom properties to :root, and body class for color mode.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--club-primary', theme.primary)
    root.style.setProperty('--club-secondary', theme.secondary)
    root.style.setProperty('--club-neutral-dark', theme.neutralDark)

    // Set color mode class on body
    document.body.classList.remove('light', 'dark')
    if (colorMode === 'auto') {
      document.body.classList.add(
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      )
    } else {
      document.body.classList.add(colorMode)
    }
  }, [theme, colorMode])

  // Keep "auto" mode honest — if the OS theme flips while the app is
  // open, follow it. Only attaches the listener when in auto mode so
  // explicit users don't get surprise theme swaps.
  useEffect(() => {
    if (colorMode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.body.classList.remove('light', 'dark')
      document.body.classList.add(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [colorMode])

  return (
    <ThemeContext.Provider value={{ theme, colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
