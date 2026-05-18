import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Heart,
  Eye,
  CalendarCheck,
  PlugZap,
  Lightbulb,
  Clock as ClockIcon,
} from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'

// Demo posts. Replace with a real `social_posts` table when accounts are
// connected via Instagram / TikTok APIs.
const DEMO_POSTS = [
  { id: 1, day: 'Mon', channel: 'IG', title: 'Game-winner clip — Crossfire vs Eclipse', time: '3:00 PM', status: 'scheduled' },
  { id: 2, day: 'Tue', channel: 'TT', title: 'Training session GRWM', time: '4:30 PM', status: 'draft' },
  { id: 3, day: 'Wed', channel: 'IG', title: 'Crumbl partnership reel', time: '6:00 PM', status: 'scheduled' },
  { id: 4, day: 'Wed', channel: 'X',  title: 'Tournament results recap', time: '8:00 PM', status: 'scheduled' },
  { id: 5, day: 'Thu', channel: 'TT', title: '"Day in the life" series ep 3', time: '5:30 PM', status: 'idea' },
  { id: 6, day: 'Fri', channel: 'IG', title: 'Crossover with Coach Sarah', time: '5:00 PM', status: 'scheduled' },
  { id: 7, day: 'Sat', channel: 'TT', title: 'Game-day fit + walkout', time: '11:00 AM', status: 'scheduled' },
  { id: 8, day: 'Sat', channel: 'IG', title: 'Post-match highlights carousel', time: '9:00 PM', status: 'draft' },
  { id: 9, day: 'Sun', channel: 'X',  title: 'Week wrap thread', time: '7:00 PM', status: 'idea' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Channel definitions — channel letter + brand color (no platform-specific
// icons because not all are available in this lucide-react version).
const CHANNELS = {
  IG: { letter: 'IG', color: '#E1306C', label: 'Instagram' },
  TT: { letter: 'TT', color: '#000000', label: 'TikTok' },
  X:  { letter: 'X',  color: '#1DA1F2', label: 'X' },
}

// Status styling
const STATUS_BG = {
  scheduled: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', label: 'Scheduled', tag: 'chip-green' },
  draft:     { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', label: 'Draft',      tag: 'chip-amber' },
  idea:      { bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.30)', label: 'Idea',     tag: 'chip-slate' },
}

export default function SocialPlanner() {
  const [weekOffset, setWeekOffset] = useState(0)  // -1 = prev, 0 = current, 1 = next

  // Compute the week label (just demo math, doesn't sync to real calendar)
  const weekLabel = (() => {
    const today = new Date()
    today.setDate(today.getDate() + weekOffset * 7)
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `Week of ${fmt(monday)} — ${fmt(sunday)}`
  })()

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        {/* Editorial header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-7">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
              <span
                className="text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ color: 'var(--crimson)' }}
              >
                Content calendar
              </span>
            </div>
            <h1 className="display-font text-4xl text-fg-primary">Social Planner</h1>
            <p className="text-text-secondary text-sm mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="secondary-btn p-2"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="secondary-btn p-2"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
            <button className="eastside-btn inline-flex items-center gap-2">
              <Plus size={14} /> New post
            </button>
          </div>
        </div>

        {/* Demo banner */}
        <div
          className="design-card p-4 mb-6 flex items-start gap-3"
          style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.15)' }}>
            <PlugZap size={15} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="text-sm text-text-secondary leading-relaxed flex-1">
            <span className="font-semibold text-fg-primary">Demo schedule.</span>{' '}
            Connect your Instagram, TikTok, and X accounts to schedule posts directly from KRS.
          </div>
          <button className="secondary-btn inline-flex items-center gap-2" style={{ fontSize: '12px' }}>
            <PlugZap size={13} /> Connect accounts
          </button>
        </div>

        {/* Week calendar */}
        <div className="grid grid-cols-7 gap-3 mb-8">
          {DAYS.map((day) => {
            const dayPosts = DEMO_POSTS.filter((p) => p.day === day)
            return (
              <div key={day}>
                {/* Day header */}
                <div className="text-center mb-2">
                  <div className="display-font text-sm text-fg-primary tracking-[0.05em]">{day}</div>
                  <div className="text-[10px] uppercase tracking-widest text-text-tertiary mt-0.5">
                    {dayPosts.length} post{dayPosts.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Posts column */}
                <div
                  className="rounded-lg p-2 space-y-2 min-h-[260px]"
                  style={{ background: 'rgba(15,23,41,0.5)', border: '1px solid #1e293b' }}
                >
                  {dayPosts.length === 0 ? (
                    <div
                      className="text-center text-[10px] text-text-tertiary italic p-4 border border-dashed rounded-md"
                      style={{ borderColor: '#1e293b' }}
                    >
                      Empty
                    </div>
                  ) : (
                    dayPosts.map((p) => {
                      const c = CHANNELS[p.channel]
                      const s = STATUS_BG[p.status]
                      // (Channel letter now used directly — no icon component.)
                      return (
                        <button
                          key={p.id}
                          className="w-full text-left rounded-md p-2 transition hover:brightness-125"
                          style={{ background: s.bg, border: `1px solid ${s.border}` }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-fg-primary"
                              style={{ background: c.color, letterSpacing: '0.04em' }}
                            >
                              {c.letter}
                            </div>
                            <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                              <ClockIcon size={9} /> {p.time}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-fg-primary leading-tight line-clamp-2">
                            {p.title}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Connected accounts', value: '0 of 3', Icon: PlugZap, sub: 'Connect to schedule' },
            { label: 'This week', value: DEMO_POSTS.length + ' posts', Icon: CalendarCheck, sub: `${DEMO_POSTS.filter(p=>p.status==='scheduled').length} scheduled` },
            { label: 'Avg engagement', value: '4.2%', Icon: Heart, sub: 'Demo data' },
            { label: 'Total reach', value: '18.2K', Icon: Eye, sub: 'Last 30 days' },
          ].map((s, i) => (
            <div key={i} className="design-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary">
                  {s.label}
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.12)' }}>
                  <s.Icon size={14} style={{ color: 'var(--crimson-3)' }} />
                </div>
              </div>
              <div className="display-font text-2xl text-fg-primary">{s.value}</div>
              <div className="text-[11px] text-text-tertiary mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Ideas / drafts row */}
        <div className="design-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb size={14} style={{ color: 'var(--crimson-3)' }} />
            <h2 className="display-font text-lg text-fg-primary">Content ideas</h2>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-text-tertiary mb-4">
            Inspiration for the week
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              'Highlight reel of your top 3 plays this season',
              '"Day in the life" — practice → school → recruiting',
              'Q&A reel about your recruiting journey',
              'Pre-game routine: meals, music, mindset',
              'Coach Sarah interview clip',
              'Behind-the-scenes from ECNL Playoffs',
            ].map((idea, i) => (
              <button
                key={i}
                className="text-left p-3 rounded-lg border border-card-border hover:border-slate-600 transition"
                style={{ background: 'rgba(15,23,41,0.4)' }}
              >
                <div className="text-sm text-fg-primary leading-snug">{idea}</div>
                <div className="text-[11px] text-text-tertiary mt-1.5 flex items-center gap-1">
                  <Plus size={11} /> Turn into a post
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AthleteLayout>
  )
}
