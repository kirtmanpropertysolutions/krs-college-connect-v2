import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
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
    if (!user || saving) return

    const currentIndex = modes.findIndex(mode => mode.id === colorMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]

    setSaving(true)
    try {
      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ color_mode: nextMode.id })
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setColorMode(nextMode.id)
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
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors disabled:opacity-50 bg-transparent"
      title={`Color Mode: ${currentMode.label}`}
    >
      <IconComponent size={16} />
      <span>{currentMode.label} Mode</span>
    </button>
  )
}