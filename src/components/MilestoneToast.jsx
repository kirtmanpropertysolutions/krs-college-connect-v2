import { useEffect } from 'react'
import MilestoneIcon from './MilestoneIcon.jsx'

/**
 * Bottom-of-screen toast that fires when an athlete earns a milestone.
 *
 * Fires once per earn, auto-dismisses after a few seconds, no close
 * button — intentionally cheap and frictionless. Sits above the mobile
 * bottom tab bar via the safe-area-aware spacing token.
 *
 * Usage: parent maintains a queue of unread earned IDs and renders one
 * MilestoneToast at a time. Calling onDismiss pops the next one off the
 * queue.
 */
export default function MilestoneToast({ milestone, onDismiss, duration = 3500 }) {
  useEffect(() => {
    if (!milestone) return
    const t = setTimeout(() => onDismiss?.(), duration)
    return () => clearTimeout(t)
  }, [milestone, duration, onDismiss])

  if (!milestone) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 design-card px-4 py-3 max-w-sm w-[calc(100vw-32px)] flex items-center gap-3 animate-slide-up-soft shadow-2xl"
      style={{
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', // sit above mobile tab bar
        // Hero-card gradient adapts via the CSS variable so the toast
        // doesn't look like a dark slab dropped on a light page.
        background: 'var(--hero-card-bg)',
        borderColor: 'rgba(200,16,46,0.45)',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-900/40 toast-badge-pop"
        style={{
          background:
            'linear-gradient(135deg, rgba(200,16,46,0.22) 0%, rgba(10,14,26,0.5) 100%)',
        }}
      >
        <MilestoneIcon name={milestone.icon} size={20} className="text-amber-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] text-red-400 font-bold mb-0.5">
          Milestone earned
        </div>
        <div className="text-fg-primary font-semibold text-sm leading-tight">
          {milestone.name}
        </div>
      </div>
      <button
        onClick={() => onDismiss?.()}
        className="text-text-tertiary hover:text-fg-primary text-xs flex-shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
