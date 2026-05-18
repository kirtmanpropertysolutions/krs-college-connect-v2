import { useState } from 'react'
import { useAuth } from '../hooks/authContext'
import { useTheme } from '../contexts/themeContext'
import { supabase } from '../lib/supabase'
import { Sun, Moon, Monitor } from 'lucide-react'

const modes = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'auto', label: 'Auto', icon: Monitor }
]

export default function ColorModeToggle() {
  const { user } = useAuth()
  const { colorMode, setColorMode } = useTheme()
  const [saving, setSaving] = useState(false)

  const handleToggle = async () => {
    if (saving) return

    const currentIndex = modes.findIndex(mode => mode.id === colorMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]

    // Update state + localStorage immediately so the UI feels instant.
    // The DB write is fire-and-forget — if the user is signed out (eg.
    // they're on the login page using the toggle from a future placement),
    // we still want the local toggle to work.
    setColorMode(nextMode.id)

    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ color_mode: nextMode.id })
        .eq('id', user.id)
      if (error) throw error
    } catch (error) {
      console.error('Error saving color mode:', error)
    } finally {
      setSaving(false)
    }
  }

  const currentMode = modes.find(mode => mode.id === colorMode) || modes[1] // default to dark

  const IconComponent = currentMode.icon

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-fg-secondary hover:text-fg-primary hover:bg-surface-card-hover rounded-lg transition-colors disabled:opacity-50 bg-transparent"
      title={`Color Mode: ${currentMode.label}`}
    >
      <IconComponent size={16} />
      <span>{currentMode.label} Mode</span>
    </button>
  )
}
