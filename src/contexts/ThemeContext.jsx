import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const ThemeContext = createContext(null)

const DEFAULT_THEME = {
  primary: '#dc2626',
  secondary: '#fbbf24',
  neutralDark: '#0a0e1a',
  logoUrl: null
}

export function ThemeProvider({ children }) {
  const { user, profile } = useAuth()
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [colorMode, setColorMode] = useState('dark')

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

      setColorMode(profile.color_mode || 'dark')
    }

    loadTheme()
  }, [user, profile])

  // Apply CSS custom properties to :root
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--club-primary', theme.primary)
    root.style.setProperty('--club-secondary', theme.secondary)
    root.style.setProperty('--club-neutral-dark', theme.neutralDark)

    // Set color mode class on body
    document.body.classList.remove('light', 'dark')
    if (colorMode === 'auto') {
      document.body.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      document.body.classList.add(colorMode)
    }
  }, [theme, colorMode])

  return (
    <ThemeContext.Provider value={{ theme, colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)