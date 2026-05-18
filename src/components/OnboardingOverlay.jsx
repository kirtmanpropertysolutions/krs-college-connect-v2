/**
 * OnboardingOverlay — first-login coach-mark walkthrough.
 *
 * Shown the first time an athlete lands on the dashboard, dimmed
 * backdrop with a spotlight that walks them through three steps:
 *
 *   1. Tier card — "This is your tier. Earn milestones to level up."
 *   2. Active quests — "These are your next moves. Tap any to start."
 *   3. Profile — "Finish your profile to unlock everything else."
 *
 * Tracks completion via localStorage (`krs_onboarded`). If the athlete
 * clears site data and signs in again, the tour replays — fine, low
 * cost. We could move to a profiles.onboarded_at column later but
 * localStorage is plenty for v1.
 *
 * Uses `data-onboard="…"` attributes on dashboard sections to find
 * what to highlight. Falls back to a fixed centered modal if the
 * target element isn't on screen (e.g. user is on a different page
 * — shouldn't happen since we only mount the overlay on the dashboard).
 */

import { useEffect, useState, useRef } from 'react'
import { ArrowRight, X } from 'lucide-react'

const STORAGE_KEY = 'krs_onboarded'

const STEPS = [
  {
    target: 'tier',
    eyebrow: 'Step 1 of 3',
    title: "You're a Rookie",
    body: "Earn milestones to climb tiers — Rookie → Squad Player → Starter → Captain → Elite. Your tier shows on your public profile so coaches see how engaged you are.",
  },
  {
    target: 'quests',
    eyebrow: 'Step 2 of 3',
    title: 'These are your next moves',
    body: "Active quests pick themselves based on what you're closest to earning. Tap any quest to jump straight to where you do that action.",
  },
  {
    target: 'profile-cta',
    eyebrow: 'Step 3 of 3',
    title: 'Start with your profile',
    body: 'Add your position, class year, GPA, and a headshot. Once your profile is done, school recommendations + outreach unlock.',
    ctaLabel: "Let's go",
  },
]

export default function OnboardingOverlay() {
  // Only show if the user hasn't completed onboarding before
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY)
    } catch {
      return false
    }
  })
  const [stepIdx, setStepIdx] = useState(0)
  const [spotlight, setSpotlight] = useState(null) // { top, left, width, height }
  const rafRef = useRef(null)

  // Find the target element by data-onboard attribute and compute
  // its bounding rect (used to draw the spotlight cutout). Recomputes
  // on resize + scroll so the spotlight tracks the target.
  useEffect(() => {
    if (!open) return
    const step = STEPS[stepIdx]
    const update = () => {
      const el = document.querySelector(`[data-onboard="${step.target}"]`)
      if (!el) {
        setSpotlight(null)
        return
      }
      const r = el.getBoundingClientRect()
      setSpotlight({
        top: r.top - 6,
        left: r.left - 6,
        width: r.width + 12,
        height: r.height + 12,
      })
      // Make sure the highlighted element is on screen
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // RAF-throttled update on scroll/resize
    const onMove = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [open, stepIdx])

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* private mode — soft fail */
    }
    setOpen(false)
  }

  if (!open) return null
  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to KRS"
    >
      {/* SVG mask backdrop — dims the page except for a rounded
          rectangle cutout around the current step's target element.
          Falls back to a flat dim if we couldn't find the target. */}
      {spotlight ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          style={{ background: 'transparent' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx="14"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.78)"
            mask="url(#spotlight-mask)"
          />
          {/* Crimson border around the cutout */}
          <rect
            x={spotlight.left}
            y={spotlight.top}
            width={spotlight.width}
            height={spotlight.height}
            rx="14"
            fill="none"
            stroke="#C8102E"
            strokeWidth="2"
          />
        </svg>
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.78)' }} />
      )}

      {/* Coach-mark card — slides up from the bottom on mobile,
          centered on desktop. Positioned BELOW the spotlight when
          possible; falls back to the bottom of the screen otherwise. */}
      <div
        className="relative design-card max-w-sm w-full p-5 animate-slide-up-soft pointer-events-auto"
        style={{
          borderColor: 'rgba(200,16,46,0.45)',
          background: 'linear-gradient(135deg, #131a2c 0%, #0f1729 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-text-tertiary hover:text-white"
          aria-label="Skip tour"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: 'var(--crimson)' }}
          >
            {step.eyebrow}
          </span>
        </div>

        <h3 className="display-font text-xl text-white leading-tight mb-2">
          {step.title}
        </h3>
        <p className="text-text-secondary text-[13px] leading-relaxed mb-5">
          {step.body}
        </p>

        {/* Step dots + nav */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: i === stepIdx ? '#C8102E' : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isLast && (
              <button onClick={finish} className="secondary-btn text-[12px]" style={{ padding: '6px 12px' }}>
                Skip
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIdx((i) => i + 1))}
              className="eastside-btn inline-flex items-center gap-1 text-[12px]"
              style={{ padding: '6px 14px' }}
            >
              {step.ctaLabel || 'Next'} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
