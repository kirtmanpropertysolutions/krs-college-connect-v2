import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Filter, Calendar, DollarSign, Tag, CheckCircle2, Clock, Sparkles, Trophy } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/authContext'

// Fallback demo deals — shown when no real org_nil_deals rows exist yet.
const DEMO_DEALS = [
  {
    id: 'demo-1',
    brand: 'Nike Soccer NW',
    logo_abbrev: 'NIKE',
    logo_color: '#000000',
    category: 'Apparel',
    payout_display: '$500 – $1,500',
    expiration_date: null,
    requirements: 'D1-committed athletes · 2K+ Instagram followers',
    description: 'Wear Nike gear at games + one Reel per month featuring product.',
    status: 'Open',
    featured: true,
    _demo: true,
  },
  {
    id: 'demo-2',
    brand: 'Crumbl Cookies — Bellevue',
    logo_abbrev: 'CRMB',
    logo_color: '#F4ABBA',
    category: 'Food & Bev',
    payout_display: '$150 + product',
    expiration_date: '2026-06-30',
    requirements: 'Local WA athletes · 1 IG post + 1 Reel',
    description: 'Walk-in cookie of the week. One post + one in-store visit per month.',
    status: 'Open',
    featured: false,
    _demo: true,
  },
  {
    id: 'demo-3',
    brand: 'Athleta Brand Athlete',
    logo_abbrev: 'ATH',
    logo_color: '#1F2937',
    category: 'Apparel',
    payout_display: '$1,000 / month',
    expiration_date: '2026-08-01',
    requirements: '5K+ verified followers · brand-aligned content history',
    description: 'Monthly retainer with quarterly product drops. Year-long commitment.',
    status: 'Open',
    featured: true,
    _demo: true,
  },
  {
    id: 'demo-4',
    brand: 'Trace ID Camera',
    logo_abbrev: 'TRCE',
    logo_color: '#0EA5E9',
    category: 'Tech',
    payout_display: 'Trace year free',
    expiration_date: null,
    requirements: 'Highlight tagging required · attribution on every clip',
    description: 'Free Trace subscription in exchange for tagged highlights from every game.',
    status: 'Open',
    featured: false,
    _demo: true,
  },
  {
    id: 'demo-5',
    brand: 'Eastside Açaí Bowls',
    logo_abbrev: 'AÇAÍ',
    logo_color: '#7C3AED',
    category: 'Food & Bev',
    payout_display: 'Free for season',
    expiration_date: null,
    requirements: 'Eastside FC roster only',
    description: 'Post-practice fuel. Three IG stories per month.',
    status: 'Open',
    featured: false,
    _demo: true,
  },
  {
    id: 'demo-6',
    brand: 'Crossfit Bellevue',
    logo_abbrev: 'CFB',
    logo_color: '#000000',
    category: 'Local biz',
    payout_display: '$200 + membership',
    expiration_date: null,
    requirements: 'Strength + conditioning content',
    description: 'Closed for the season — opens again Sept 2026.',
    status: 'Closed',
    featured: false,
    _demo: true,
  },
]

const STATUS_STYLES = {
  Open:   { chip: 'chip-green', icon: Sparkles,     label: 'Open' },
  Closed: { chip: 'chip-slate', icon: CheckCircle2, label: 'Closed' },
}

export default function NILDeals() {
  const { profile } = useAuth()
  const orgId = profile?.org_id
  const [filter, setFilter]     = useState('All')
  const [deals, setDeals]       = useState([])
  const [loading, setLoading]   = useState(true)
  // `usingDemo` was historically wired to a demo-data fallback that we since
  // replaced with the honest "Coming soon" empty state. Kept as a constant so
  // the stat-card sub-label preserves its old "From your club" copy.
  const [usingDemo] = useState(false)

  // Pagination — show 20 at a time, "Load more" if there are more
  const NIL_PAGE_SIZE = 20
  const [displayCount, setDisplayCount] = useState(NIL_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  /**
   * Load real NIL deals from the club's `org_nil_deals` rows. Used to
   * fall back to a curated DEMO_DEALS array when nothing was there,
   * but athletes were reading those fake brands as real partnerships
   * and clicking through expecting an Apply CTA. Now: if there are no
   * real deals, we show an honest "Coming soon" empty state with a
   * note that the club hasn't lined up partnerships yet. DEMO_DEALS
   * is preserved in source for marketing screenshots only.
   */
  const loadDeals = useCallback(async () => {
    try {
      if (!orgId) {
        setDeals([])
        return
      }

      const { data, error } = await supabase
        .from('org_nil_deals')
        .select('*')
        .eq('org_id', orgId)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (err) {
      console.error('Error loading NIL deals:', err)
      setDeals([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    // Sync-with-external-state: load club NIL deals from Supabase whenever the profile changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeals()
  }, [loadDeals])

  const formatDeadline = (d) => {
    if (!d) return 'Open'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const statuses = ['All', 'Open', 'Closed']
  const counts = Object.fromEntries(
    statuses.map(s => [s, s === 'All' ? deals.length : deals.filter(d => d.status === s).length])
  )
  const list = filter === 'All' ? deals : deals.filter(d => d.status === filter)

  // Pagination derived values
  const visibleDeals = list.slice(0, displayCount)
  const hasMoreDeals = displayCount < list.length

  const handleFilterChange = (f) => {
    setFilter(f)
    setDisplayCount(NIL_PAGE_SIZE) // Reset to top when switching tabs
  }

  const handleLoadMoreDeals = () => {
    setLoadingMore(true)
    setTimeout(() => {
      setDisplayCount(prev => prev + NIL_PAGE_SIZE)
      setLoadingMore(false)
    }, 300)
  }

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
                Club partnerships
              </span>
            </div>
            <h1 className="display-font text-4xl text-white">NIL Deals</h1>
            <p className="text-text-secondary text-sm mt-1">
              Sponsorships your club has lined up for athletes. Apply directly through your director.
            </p>
          </div>
          <button className="secondary-btn inline-flex items-center gap-2">
            <Filter size={14} /> Filter
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statuses.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`pill ${filter === f ? 'active' : ''}`}
            >
              {f} · {counts[f]}
            </button>
          ))}
        </div>

        {/* Info banner — only shown when there ARE real deals.
            When the org has no deals yet we render a dedicated empty
            state below instead, so we don't dilute that with an
            explanatory banner. */}
        {deals.length > 0 && (
          <div
            className="design-card p-4 mb-6 flex items-start gap-3"
            style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <Sparkles size={15} style={{ color: 'var(--gold)' }} />
            </div>
            <div className="text-sm text-text-secondary leading-relaxed">
              <span className="font-semibold text-white">Curated by your club.</span>{' '}
              These are partnerships your director has personally sourced —
              local sponsors, brand relationships, and product trades. New
              deal? Ask your director to add it.
            </div>
          </div>
        )}

        {/* Deal grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="design-card p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-gray-700 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-gray-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          /* Zero deals at all (not just zero matching the filter) —
             show an honest "Coming soon" treatment instead of the
             demo-deals placeholder that used to live here. Athletes
             see what's actually true: their director hasn't lined up
             partnerships yet. */
          <div className="hero-card crimson-glow-bg p-8 md:p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center border border-red-900/40"
              style={{
                background:
                  'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)',
              }}
            >
              <Trophy size={26} className="text-red-500" strokeWidth={2} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="chip chip-amber">Coming soon</span>
            </div>
            <h2 className="display-font text-3xl text-white mb-3 leading-tight">
              NIL deals are on the way
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed mb-6">
              Your club director will line up local sponsors, brand
              relationships, and product trades — and they'll show up
              here for you to apply to directly.
            </p>
            <p className="text-text-tertiary text-xs">
              Got a sponsor connection? Email your director and they'll add it.
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="design-card p-12 text-center">
            <Tag className="mx-auto mb-3 text-text-tertiary" size={28} />
            <p className="text-text-secondary text-sm">No deals match this filter.</p>
          </div>
        ) : (
          <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleDeals.map((d) => {
              const statusKey = d.status in STATUS_STYLES ? d.status : 'Closed'
              const s = STATUS_STYLES[statusKey]
              const StatusIcon = s.icon
              return (
                <div
                  key={d.id}
                  className="design-card p-5 relative overflow-hidden transition hover:border-slate-600"
                  style={d.featured ? { borderColor: 'rgba(200,16,46,0.45)' } : undefined}
                >
                  {/* Featured ribbon */}
                  {d.featured && (
                    <div
                      className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(200,16,46,0.18)', color: '#ff6b7a' }}
                    >
                      Featured
                    </div>
                  )}

                  {/* Brand header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
                      style={{ background: d.logo_color || '#1F2937', letterSpacing: '0.05em' }}
                    >
                      {d.logo_abbrev || d.brand.slice(0, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="display-font text-[15px] text-white leading-tight">
                        {d.brand}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mt-0.5">
                        {d.category}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary mb-4 leading-relaxed line-clamp-2">
                    {d.description}
                  </p>

                  {/* Payout + deadline */}
                  <div className="border-t border-card-border pt-3 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-tertiary flex items-center gap-1.5">
                        <DollarSign size={13} /> Payout
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                        {d.payout_display || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-tertiary flex items-center gap-1.5">
                        <Calendar size={13} /> Deadline
                      </span>
                      <span className="text-text-secondary">{formatDeadline(d.expiration_date)}</span>
                    </div>
                  </div>

                  {/* Requirements */}
                  {d.requirements && (
                    <div className="text-[11px] text-text-tertiary mb-4 leading-snug">
                      {d.requirements}
                    </div>
                  )}

                  {/* Footer: status + CTA */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`chip ${s.chip} inline-flex items-center gap-1`}>
                      <StatusIcon size={11} /> {s.label}
                    </span>
                    <button
                      className={
                        d.status === 'Open'
                          ? 'eastside-btn'
                          : 'secondary-btn opacity-60 cursor-not-allowed'
                      }
                      style={{ padding: '7px 14px', fontSize: '12px' }}
                      disabled={d.status !== 'Open'}
                    >
                      {d.status === 'Open' ? 'Apply' : 'Closed'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Loading skeleton cards for "load more" */}
            {loadingMore && Array.from({ length: 3 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="design-card p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-gray-700 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-gray-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-4/5" />
              </div>
            ))}
          </div>

          {/* Load more button — only shown if there are more deals to show */}
          {hasMoreDeals && !loadingMore && (
            <div className="flex flex-col items-center gap-2 mt-6">
              <button
                onClick={handleLoadMoreDeals}
                className="secondary-btn px-8 py-3"
              >
                Load more deals
              </button>
              <p className="text-text-tertiary text-xs">
                Showing {visibleDeals.length} of {list.length} deals
              </p>
            </div>
          )}
          </>
        )}

        {/* Earning summary footer */}
        {!loading && (
          <div className="design-card p-6 mt-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: 'Open deals',   value: counts.Open,       Icon: Sparkles, sub: 'Apply today' },
                { label: 'Closed deals', value: counts.Closed,     Icon: Trophy,   sub: 'Season ended' },
                { label: 'Total deals',  value: deals.length,      Icon: TrendingUp, sub: usingDemo ? 'Sample data' : 'From your club' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.Icon size={14} style={{ color: 'var(--crimson-3)' }} />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary">
                      {s.label}
                    </span>
                  </div>
                  <div className="display-font text-2xl text-white">{s.value}</div>
                  <div className="text-[11px] text-text-tertiary mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}
