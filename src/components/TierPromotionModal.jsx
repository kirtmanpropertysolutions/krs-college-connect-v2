import { Trophy, ArrowRight, X } from 'lucide-react'
import EastsideFCLogo from './EastsideFC_Logo.jsx'

/**
 * Full-screen tier promotion modal.
 *
 * Fires when an athlete's earned-count crosses a tier threshold
 * (Rookie → Squad Player → Starter → Captain → Elite). This is the
 * ceremonial moment of the gamification system — the big payoff that
 * makes the daily grind worth it. Intentionally NOT a small toast.
 *
 * Copy makes the moment matter: ties the tier to something the athlete
 * unlocks in the real world (visibility to coaches, etc.) so it feels
 * like leveling up, not just collecting stickers.
 */
export default function TierPromotionModal({ tier, onClose }) {
  if (!tier) return null

  const promoCopy = {
    squad_player:
      "You've moved past rookie. Your activity is becoming a real recruiting profile coaches can see.",
    starter:
      'Your earned milestones now show on your public profile to coaches. They see that you do the work.',
    captain:
      "You're in the top tier of athlete engagement. Your director sees this — expect more curated opportunities.",
    elite:
      "You've earned almost every milestone available. Use this signal in every outreach — coaches respect it.",
  }
  const subcopy = promoCopy[tier.id] || 'Keep going.'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Promoted to ${tier.name}`}
    >
      <div
        className="hero-card relative max-w-md w-full p-8 text-center animate-slide-up-soft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Crimson glow + crest decoration */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[14px]"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(200,16,46,0.30) 0%, transparent 60%)',
          }}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative">
          {/* Background watermark crest */}
          <div className="opacity-[0.08] mb-2 flex justify-center">
            <EastsideFCLogo size={80} />
          </div>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-4 -mt-3">
            <div className="h-px w-8" style={{ background: tier.color }} />
            <span
              className="text-[10px] uppercase tracking-[0.22em] font-bold"
              style={{ color: tier.color }}
            >
              Tier promotion
            </span>
            <div className="h-px w-8" style={{ background: tier.color }} />
          </div>

          {/* Big badge — spring-pops in on mount. Pulsing halo ring
              behind it gives the moment ceremonial weight without
              needing a confetti library. */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div
              className="absolute inset-0 rounded-full tier-promo-ring pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(200,16,46,0.35) 0%, transparent 60%)',
              }}
              aria-hidden="true"
            />
            <div
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center border-2 tier-promo-badge"
              style={{
                borderColor: tier.color,
                background:
                  'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)',
              }}
            >
              <Trophy size={36} style={{ color: tier.color }} strokeWidth={2} />
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-text-secondary mb-2">
            You're now a
          </p>
          <h2
            className="display-font text-[36px] text-white leading-none mb-4 tracking-[0.05em]"
            style={{ color: tier.color }}
          >
            {tier.name}
          </h2>

          <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            {subcopy}
          </p>

          <button
            onClick={onClose}
            className="eastside-btn inline-flex items-center gap-2"
          >
            Keep going <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
