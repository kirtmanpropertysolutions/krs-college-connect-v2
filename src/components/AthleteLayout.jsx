import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/authContext'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Home,
  Building2,
  Mail,
  Video,
  User,
  Menu,
  X,
  Sparkles,
  Search,
  ListChecks,
  Calendar,
  Film,
  TrendingUp,
  Bell,
  DollarSign,
} from 'lucide-react'
import EastsideFCLogo from './EastsideFC_Logo.jsx'
import ColorModeToggle from './ColorModeToggle.jsx'
import InstallCTA from './InstallCTA.jsx'

/**
 * Pure helper — formats how long ago `iso` was, relative to the caller's `now`.
 * Hoisted to module scope so it doesn't call Date.now() during render (which
 * trips react-hooks/purity). Callers pass a `now` value that updates whenever
 * the activity list changes (memoized in the component below).
 */
function timeAgoShort(iso, now) {
  const ms = now - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function AthleteLayout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // ---- Top-bar search state ----
  const [searchQuery, setSearchQuery] = useState('')
  // Raw async fetch results. When the query is too short to fetch, we DERIVE
  // an empty result below instead of writing state from inside the effect,
  // which keeps the render path free of the set-state-in-effect anti-pattern.
  const [rawSearchResults, setRawSearchResults] = useState({ schools: [], coaches: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchBoxRef = useRef(null)

  const trimmedQuery = searchQuery.trim()
  const querySearchable = trimmedQuery.length >= 2
  // Derive what we show. Short queries always render the empty state without
  // triggering a state write.
  const searchResults = querySearchable
    ? rawSearchResults
    : { schools: [], coaches: [] }

  // Debounced live search: schools (by name) + coaches (by name).
  // Sync-with-external-state — the async fetch and its loading flag are both
  // owned by Supabase, not derivable from props/state at render time.
  useEffect(() => {
    if (!querySearchable) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearching(true)
    const q = trimmedQuery
    const t = setTimeout(async () => {
      try {
        const [{ data: schools }, { data: coaches }] = await Promise.all([
          supabase
            .from('schools')
            .select('id, name, short_name, division, conference, state, primary_color')
            .ilike('name', `%${q}%`)
            .limit(6),
          supabase
            .from('coaches')
            .select('id, name, title, email, schools(name)')
            .ilike('name', `%${q}%`)
            .limit(4),
        ])
        setRawSearchResults({ schools: schools || [], coaches: coaches || [] })
      } catch (e) {
        console.error('Search failed:', e)
      } finally {
        setSearching(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [trimmedQuery, querySearchable])

  // Close search dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [searchOpen])

  const goToSchool = (school) => {
    setSearchQuery('')
    setSearchOpen(false)
    navigate(`/coach-finder?school=${encodeURIComponent(school.name)}`)
  }
  const goToCoach = (coach) => {
    setSearchQuery('')
    setSearchOpen(false)
    navigate(`/outreach?school=${encodeURIComponent(coach.schools?.name || '')}&coach_id=${coach.id}`)
  }

  // ---- Notification bell state ----
  const [bellOpen, setBellOpen] = useState(false)
  const [activity, setActivity] = useState([])
  const bellRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('recruiting_activity')
      .select('id, activity_type, activity_data, created_at')
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setActivity(data || []))
  }, [user?.id, bellOpen])

  useEffect(() => {
    const onClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    if (bellOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [bellOpen])

  const formatActivity = (a) => {
    const d = a.activity_data || {}
    const map = {
      school_added: `Added ${d.school_name || 'a school'} to pipeline`,
      school_removed: `Removed ${d.school_name || 'a school'} from pipeline`,
      stage_changed: `Moved ${d.school_name || 'a school'} to ${(d.to_stage || '').toUpperCase()}`,
      note_saved: `Saved notes on ${d.school_name || 'a school'}`,
      email_sent: `Emailed ${d.coach_name || 'a coach'} at ${d.school_name || 'a school'}`,
      quiz_completed: 'Completed your School Fit Quiz',
      profile_updated: 'Updated your profile',
      school_viewed: `Viewed ${d.school_name || 'a school'}`,
      coach_replied: `Coach replied — ${(d.reply_status || 'pending').toUpperCase()}`,
    }
    return map[a.activity_type] || 'Recruiting activity'
  }
  const activityHref = (a) => {
    const t = a.activity_type
    if (t === 'email_sent' || t === 'coach_replied') return '/outreach'
    if (t === 'school_added' || t === 'school_removed' || t === 'stage_changed' || t === 'note_saved' || t === 'school_viewed') return '/my-schools'
    if (t === 'quiz_completed') return '/school-fit-quiz'
    if (t === 'profile_updated') return '/profile'
    return '/'
  }
  // Capture a "now" timestamp whenever the activity list changes. Stored in
  // state and written from an effect so we never call Date.now() during
  // render. The bell only re-renders when activity changes, which is the
  // right cadence for stale "5m ago" labels — and the helper stays pure.
  const [activityNow, setActivityNow] = useState(() => Date.now())
  useEffect(() => {
    // Sync-with-external-clock: snapshot Date.now() each time activity updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivityNow(Date.now())
  }, [activity])

  // Close drawer on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }

    if (mobileDrawerOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [mobileDrawerOpen])

  // Sectioned nav with icons
  const navSections = [
    {
      label: 'Recruiting',
      items: [
        { to: '/', icon: Home, label: 'Dashboard', end: true },
        { to: '/my-schools', icon: ListChecks, label: 'My Schools' },
        { to: '/coach-finder', icon: Search, label: 'Coach Finder' },
        { to: '/outreach', icon: Mail, label: 'Outreach' },
        { to: '/school-fit-quiz', icon: Sparkles, label: 'School Fit Quiz' },
        { to: '/recruiting-events', icon: Calendar, label: 'ID Camps' },
        { to: '/budget', icon: DollarSign, label: 'Budget Builder' },
      ],
    },
    {
      label: 'Content',
      items: [
        { to: '/highlights', icon: Video, label: 'Highlights' },
        { to: '/video-studio', icon: Film, label: 'Video Studio' },
      ],
    },
    {
      label: 'Sponsors',
      items: [
        { to: '/nil-deals', icon: TrendingUp, label: 'NIL Deals' },
      ],
    },
    {
      label: 'Account',
      items: [{ to: '/profile', icon: User, label: 'My Profile' }],
    },
  ]

  const navLinkClasses = ({ isActive }) =>
    [
      'flex items-center gap-3 text-[13px] font-medium transition-all',
      'mx-2 px-3 py-2 rounded-lg border-l-2',
      isActive
        ? 'nav-item-active'
        : 'border-transparent text-text-secondary hover:text-white hover:bg-navy-800',
    ].join(' ')

  const initials =
    profile?.full_name?.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    'A'

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* ===== Left Sidebar (desktop) ===== */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 scroll-thin overflow-y-auto"
        style={{ width: '264px', background: '#0a0e1a', borderRight: '1px solid #1e293b' }}
      >
        {/* Logo section — club crest is the hero. Larger size (80px) and
            a soft crimson halo behind the crest make the sidebar feel
            like a club identity, not a generic dashboard chrome. The
            "KRS" wordmark only appears on the marketing site / billing
            per the brand spec — inside the app, the club leads. */}
        <div className="px-5 pt-7 pb-5 border-b border-card-border text-center">
          <div className="relative mx-auto mb-4 w-fit">
            <div
              className="absolute inset-0 -m-3 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(200,16,46,0.22) 0%, transparent 65%)',
              }}
            />
            <EastsideFCLogo size={80} className="relative mx-auto" />
          </div>
          <div className="display-font text-[16px] tracking-[0.08em] text-white">
            {profile?.organization?.name || 'Eastside FC'}
          </div>
          <div
            className="text-[9px] tracking-[0.2em] uppercase mt-1"
            style={{ color: 'var(--gold)' }}
          >
            Est. 1970 · Washington
          </div>
          {/* Hairline divider — editorial flourish */}
          <div className="mt-3 mx-auto h-px w-8" style={{ background: 'var(--crimson)' }} />
          <div className="text-[9px] tracking-[0.25em] uppercase mt-1.5 text-text-tertiary">
            Recruiting
          </div>
        </div>

        {/* Navigation sections — scrollable */}
        <nav className="flex-1 py-3">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <h3 className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-bold px-5 mb-2">
                {section.label}
              </h3>
              <div>
                {section.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink key={to} to={to} end={end} className={navLinkClasses}>
                    <Icon size={16} className="flex-shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: color mode + user card */}
        <div className="mt-auto px-3 pb-4 border-t border-card-border pt-3">
          <div className="mb-2 px-2">
            <ColorModeToggle />
          </div>
          <div className="design-card p-3">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--crimson) 0%, var(--club-neutral-dark, #1B2A4A) 100%)',
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-[13px] font-medium truncate">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Athlete'}
                </div>
                <div className="text-text-tertiary text-[11px] truncate">
                  {profile?.athlete?.class_year ? `${profile.athlete.class_year} · ` : ''}
                  {profile?.athlete?.position || 'Athlete'}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full text-[11px] py-1.5 text-text-secondary hover:text-white transition-colors rounded hover:bg-navy-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* Mobile top bar — branded sticky header with NO duplicate
            menu button. Menu lives in the bottom tab bar's "More"
            entry now, so there's a single nav surface on mobile
            instead of two competing ones (hamburger + tab bar). */}
        <header
          className="md:hidden sticky top-0 z-40 flex items-center justify-center px-4 py-3 border-b border-card-border"
          style={{
            background: 'rgba(10,14,26,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          {/* Crest sized up — was 22px which made the brand
              barely visible on phones. 36px reads as a real
              banner and matches what the eye expects from
              "this app is by Eastside FC". */}
          <div className="flex items-center gap-2.5">
            <EastsideFCLogo size={36} />
            <span className="display-font text-[15px] tracking-[0.08em] text-white">
              {profile?.organization?.name || 'Eastside FC'}
            </span>
          </div>
        </header>

        {/* Top bar (desktop) */}
        <header
          className="hidden md:flex items-center justify-between px-8 py-4 sticky top-0 z-20 border-b border-card-border"
          style={{ background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] uppercase tracking-widest font-bold"
              style={{ color: 'var(--text-secondary)' }}
            >
              {profile?.organization?.name || 'Eastside FC'}
            </span>
            <span className="chip chip-slate">2025–26</span>
          </div>
          <div className="flex items-center gap-3">
            {/* ===== Live search ===== */}
            <div className="relative" ref={searchBoxRef}>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#64748b' }}
              />
              <input
                type="text"
                placeholder="Search schools or coaches…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                className="form-input pl-10 py-2 text-sm w-full md:w-[340px] max-w-[60vw]"
              />

              {/* Dropdown */}
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 design-card overflow-hidden z-50"
                  style={{ maxHeight: '420px', overflowY: 'auto' }}
                >
                  {searching && (
                    <div className="px-4 py-3 text-xs text-text-tertiary">Searching…</div>
                  )}

                  {!searching &&
                    searchResults.schools.length === 0 &&
                    searchResults.coaches.length === 0 && (
                      <div className="px-4 py-6 text-center text-text-tertiary text-sm">
                        No matches for <span className="text-white">"{searchQuery}"</span>
                      </div>
                    )}

                  {searchResults.schools.length > 0 && (
                    <div>
                      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-text-tertiary font-bold">
                        Schools · {searchResults.schools.length}
                      </div>
                      {searchResults.schools.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => goToSchool(s)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-navy-800 text-left transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: s.primary_color || '#1e293b' }}
                          >
                            {(s.short_name || s.name).split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{s.name}</div>
                            <div className="text-[11px] text-text-tertiary">
                              {s.division} · {s.conference || '—'} · {s.state || '—'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.coaches.length > 0 && (
                    <div>
                      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-text-tertiary font-bold border-t border-card-border mt-1">
                        Coaches · {searchResults.coaches.length}
                      </div>
                      {searchResults.coaches.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => goToCoach(c)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-navy-800 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {(c.name || 'C').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{c.name}</div>
                            <div className="text-[11px] text-text-tertiary truncate">
                              {c.schools?.name || 'Unknown school'} · {c.title || 'Head Coach'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== Notification bell ===== */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                className="relative w-10 h-10 rounded-lg hover:bg-navy-800 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {activity.length > 0 && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: 'var(--crimson)' }}
                  />
                )}
              </button>

              {bellOpen && (
                <div
                  className="absolute right-0 top-full mt-2 design-card overflow-hidden z-50 w-[calc(100vw-2rem)] md:w-[360px]"
                  style={{ maxHeight: '460px', overflowY: 'auto' }}
                >
                  <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
                    <div>
                      <div className="display-font text-sm text-white">Activity</div>
                      <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
                        Recent events
                      </div>
                    </div>
                    <button
                      onClick={() => setBellOpen(false)}
                      className="text-[11px] text-text-tertiary hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  {activity.length === 0 ? (
                    <div className="px-4 py-8 text-center text-text-tertiary text-sm">
                      Nothing recent — keep building your pipeline.
                    </div>
                  ) : (
                    <div className="py-1">
                      {activity.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setBellOpen(false)
                            navigate(activityHref(a))
                          }}
                          className="w-full px-4 py-2.5 hover:bg-navy-800 text-left transition-colors flex items-start gap-3"
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ background: 'var(--crimson-3)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white leading-snug">
                              {formatActivity(a)}
                            </div>
                            <div className="text-[11px] text-text-tertiary mt-0.5">
                              {timeAgoShort(a.created_at, activityNow)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {children}

        {/* Reserve space so the fixed mobile tab bar doesn't cover the
            last card on the page. Hidden on md+ via the class itself. */}
        <div className="mobile-tabbar-spacer" aria-hidden="true" />
      </main>

      {/* PWA install prompt — sticky banner above the mobile tab bar.
          Renders nothing if the app is already installed, the user
          dismissed it, or the browser can't install (e.g. Firefox
          desktop). Smart-detects iOS vs Chrome to show the right
          instructions or a one-tap Install button. */}
      <InstallCTA />

      {/* ===== Mobile Bottom Tab Bar =====
           Uses `.mobile-tabbar` from index.css which is safe-area-aware
           (pads bottom by env(safe-area-inset-bottom) so the home
           indicator doesn't overlap tab labels) and applies a blurred
           translucent background for a native-app feel.

           The spacer below children reserves room at the bottom of the
           scrollable content area so the tab bar doesn't cover the last
           card on the page. */}
      <nav className="mobile-tabbar no-select">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `mobile-tabbar-item ${isActive ? 'active' : ''}`}
        >
          <Home size={20} strokeWidth={2.2} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/my-schools"
          className={({ isActive }) => `mobile-tabbar-item ${isActive ? 'active' : ''}`}
        >
          <Building2 size={20} strokeWidth={2.2} />
          <span>Schools</span>
        </NavLink>

        <NavLink
          to="/outreach"
          className={({ isActive }) => `mobile-tabbar-item ${isActive ? 'active' : ''}`}
        >
          <Mail size={20} strokeWidth={2.2} />
          <span>Outreach</span>
        </NavLink>

        {/* "More" replaces the dedicated Studio tab (Studio is still in
            the drawer + coming-soon). Tapping More opens the same drawer
            the hamburger used to trigger — so there's now one nav
            surface on mobile, not two competing ones. */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="mobile-tabbar-item"
          aria-label="Open more menu"
        >
          <Menu size={20} strokeWidth={2.2} />
          <span>More</span>
        </button>

        <NavLink
          to="/profile"
          data-onboard="profile-cta"
          className={({ isActive }) => `mobile-tabbar-item ${isActive ? 'active' : ''}`}
        >
          <User size={20} strokeWidth={2.2} />
          <span>Profile</span>
        </NavLink>
      </nav>

      {/* ===== Mobile Drawer =====
           Pads top by env(safe-area-inset-top) so the crest and
           close button aren't hidden behind the iPhone notch / Dynamic
           Island / status bar clock. Previously the drawer content
           started at y=0 and the time/notch overlapped the brand. */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-70"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-navy-900 border-r border-gray-700 overflow-y-auto"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="p-6">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute right-4 p-2 text-gray-400 hover:text-white tap-target"
                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>

              {/* Mobile drawer header — club crest gets the same halo
                  treatment as the desktop sidebar so the brand stays
                  consistent whether the user is on phone or desktop. */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-shrink-0">
                  <div
                    className="absolute inset-0 -m-2 rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(200,16,46,0.25) 0%, transparent 65%)',
                    }}
                  />
                  <EastsideFCLogo size={64} className="relative" />
                </div>
                <div>
                  <div className="display-font text-white tracking-[0.08em] text-base">
                    {profile?.organization?.name || 'Eastside FC'}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-text-secondary mt-1">
                    Recruiting Platform
                  </div>
                </div>
              </div>

              {navSections.map((section) => (
                <div key={section.label} className="mb-5">
                  <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-2">
                    {section.label}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map(({ to, icon: Icon, label, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive
                              ? 'bg-navy-800 text-white'
                              : 'text-gray-300 hover:text-white hover:bg-navy-800'
                          }`
                        }
                      >
                        <Icon size={16} /> {label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-6 design-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--crimson) 0%, var(--club-neutral-dark, #1B2A4A) 100%)',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">
                      {profile?.full_name || user?.email?.split('@')[0] || 'Athlete'}
                    </div>
                    {profile?.athlete?.class_year && (
                      <div className="text-gray-400 text-xs">
                        Class of {profile.athlete.class_year}
                      </div>
                    )}
                  </div>
                </div>
                {/* "Refresh app" — clears the service-worker caches
                    and reloads. Lets users recover from a wedged
                    state without having to force-quit the app. */}
                <button
                  onClick={async () => {
                    try {
                      if ('caches' in window) {
                        const names = await caches.keys()
                        await Promise.all(names.map((n) => caches.delete(n)))
                      }
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations()
                        await Promise.all(regs.map((r) => r.unregister()))
                      }
                    } catch (e) {
                      console.warn('refresh cleanup failed:', e)
                    }
                    window.location.reload()
                  }}
                  className="w-full btn-ghost text-xs py-2 mb-2"
                >
                  ↻ Refresh app
                </button>
                <button
                  onClick={() => {
                    signOut()
                    setMobileDrawerOpen(false)
                  }}
                  className="w-full btn-ghost text-xs py-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
