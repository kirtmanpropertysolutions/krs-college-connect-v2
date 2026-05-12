import { Link } from 'react-router-dom'
import { X, ChevronRight } from 'lucide-react'

export default function RecruitingScoreBreakdown({ score, breakdown, onClose }) {
  const sections = [
    {
      key: 'profile',
      label: 'Profile Completeness',
      score: breakdown.profile.score,
      max: breakdown.profile.max,
      description: 'A complete profile helps coaches find you.',
      cta: { label: 'Complete profile', href: '/profile' },
      tip: 'Add your highlight reel, GPA, position, and graduation year.'
    },
    {
      key: 'pipeline',
      label: 'Pipeline Depth',
      score: breakdown.pipeline.score,
      max: breakdown.pipeline.max,
      description: 'Top recruits track 5+ schools.',
      cta: { label: 'Find schools', href: '/coach-finder' },
      tip: '5 or more schools in your pipeline maxes this out.'
    },
    {
      key: 'outreach',
      label: 'Outreach Activity',
      score: breakdown.outreach.score,
      max: breakdown.outreach.max,
      description: 'Coaches commit to athletes who reach out.',
      cta: { label: 'Write to coaches', href: '/outreach' },
      tip: 'Send 3+ emails in 30 days to max this out.'
    },
    {
      key: 'engagement',
      label: 'Recent Activity',
      score: breakdown.engagement.score,
      max: breakdown.engagement.max,
      description: 'Recruiting is a habit, not a sprint.',
      cta: { label: 'Open the app daily', href: '/' },
      tip: 'Activity on 5+ different days per week maxes this out.'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-navy-900 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-navy-900 border-b border-gray-700 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">RECRUITING SCORE</p>
            <h2 className="text-3xl font-black text-white">{score}<span className="text-lg text-gray-400 font-normal"> / 100</span></h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400"/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sections.map(s => {
            const pct = Math.round((s.score / s.max) * 100)
            const isMaxed = s.score >= s.max
            return (
              <div key={s.key} className="bg-navy-800 rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold text-white">{s.label}</h3>
                  <span className={isMaxed ? 'text-green-400 text-sm font-mono' : 'text-gray-400 text-sm font-mono'}>
                    {s.score} / {s.max}
                  </span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden mb-3">
                  <div
                    className={isMaxed ? 'h-full bg-green-500' : 'h-full bg-club-primary'}
                    style={{width: `${pct}%`, transition: 'width 600ms ease-out'}}
                  />
                </div>
                <p className="text-sm text-gray-300 mb-1">{s.description}</p>
                <p className="text-xs text-gray-500 mb-3">{s.tip}</p>
                {!isMaxed && (
                  <Link
                    to={s.cta.href}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-sm text-club-primary hover:text-club-primary-light font-medium"
                  >
                    {s.cta.label} <ChevronRight className="w-4 h-4"/>
                  </Link>
                )}
                {isMaxed && (
                  <p className="text-sm text-green-400 font-medium">✓ Maxed out</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}