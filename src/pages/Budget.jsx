/**
 * Budget Builder — athletes track the REAL cost of college ID camps.
 *
 * Why this exists: club sports + recruiting is one of the most
 * expensive line items in a teen athlete's family budget, and most
 * kids have zero visibility into what it actually costs. A $475
 * Stanford camp fee easily becomes $1,300 once flights + hotel +
 * food + gear are factored in. This page makes that visible.
 *
 * The page is also a soft education tool — copy in the sidebar
 * explains the typical cost of an ECNL recruiting cycle so kids
 * understand the investment their families are making.
 *
 * Data model: we extend the existing `scheduled_camps` row with
 * five expense columns (travel, lodging, food, gear, misc). The
 * camp fee lives in the existing `cost` column. Saving is per-field
 * debounced so we don't spam the database while the athlete types.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  Plane,
  Bed,
  UtensilsCrossed,
  Shirt,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Trophy,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../hooks/authContext'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'

// Expense categories — paired with icons and a color for the breakdown bar.
const CATEGORIES = [
  { key: 'cost',         label: 'Camp fee',  icon: DollarSign,        color: '#C8102E' },
  { key: 'travel_cost',  label: 'Travel',    icon: Plane,             color: '#fbbf24' },
  { key: 'lodging_cost', label: 'Lodging',   icon: Bed,               color: '#60a5fa' },
  { key: 'food_cost',    label: 'Food',      icon: UtensilsCrossed,   color: '#34d399' },
  { key: 'gear_cost',    label: 'Gear',      icon: Shirt,             color: '#a78bfa' },
  { key: 'misc_cost',    label: 'Misc',      icon: MoreHorizontal,    color: '#94a3b8' },
]

const fmt$ = (n) =>
  (n || 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

export default function Budget() {
  const { user } = useAuth()
  const userId = user?.id
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  // Debounce timer per row so each keystroke doesn't hit the DB.
  const saveTimers = useRef({})

  const loadCamps = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('scheduled_camps')
      .select('*')
      .eq('athlete_id', userId)
      .order('camp_date')
    setCamps(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // Sync-with-external-state: load the athlete's scheduled camps from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) loadCamps()
    const timers = saveTimers.current
    return () => {
      // Clear any pending debounce timers on unmount
      Object.values(timers).forEach((t) => clearTimeout(t))
    }
  }, [userId, loadCamps])

  // Total per camp + grand total across all camps. Memoized so the
  // chart doesn't re-compute on every keystroke.
  const totals = useMemo(() => {
    const perCamp = camps.map((c) => ({
      id: c.id,
      total: CATEGORIES.reduce((s, cat) => s + (Number(c[cat.key]) || 0), 0),
    }))
    const grandTotal = perCamp.reduce((s, c) => s + c.total, 0)
    const byCategory = CATEGORIES.map((cat) => ({
      ...cat,
      total: camps.reduce((s, c) => s + (Number(c[cat.key]) || 0), 0),
    }))
    return { perCamp, grandTotal, byCategory }
  }, [camps])

  /**
   * Local-state-first update with debounced DB save. Typing is instant
   * (state changes per keystroke) but Postgres only sees the final
   * value after a 600ms quiet period. Per-row timer so editing
   * multiple camps doesn't fight a shared debounce.
   */
  const handleFieldChange = (campId, field, value) => {
    const numeric = value === '' ? 0 : parseInt(value, 10)
    if (Number.isNaN(numeric)) return
    setCamps((prev) =>
      prev.map((c) => (c.id === campId ? { ...c, [field]: numeric } : c))
    )
    if (saveTimers.current[campId]) clearTimeout(saveTimers.current[campId])
    saveTimers.current[campId] = setTimeout(async () => {
      await supabase
        .from('scheduled_camps')
        .update({ [field]: numeric })
        .eq('id', campId)
        .eq('athlete_id', user.id)
    }, 600)
  }

  if (loading) {
    return (
      <AthleteLayout>
        <div className="px-4 md:px-8 py-8 animate-pulse">
          <div className="h-6 bg-navy-800 rounded w-1/3 mb-4" />
          <div className="h-32 bg-navy-800 rounded-xl mb-4" />
          <div className="h-48 bg-navy-800 rounded-xl" />
        </div>
      </AthleteLayout>
    )
  }

  // Empty state — no scheduled camps yet
  if (camps.length === 0) {
    return (
      <AthleteLayout>
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] text-red-500 font-bold">
              Cost transparency
            </span>
          </div>
          <h1 className="display-font text-4xl text-white mb-5">Budget Builder</h1>

          <div className="hero-card crimson-glow-bg p-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center border border-red-900/40"
              style={{
                background:
                  'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)',
              }}
            >
              <DollarSign size={26} className="text-red-500" strokeWidth={2} />
            </div>
            <h2 className="display-font text-2xl text-white mb-2">
              No camps on your schedule yet
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md mx-auto mb-6">
              Add camps to your schedule, then come back here to see the
              REAL cost — fee + travel + lodging + food. Most families
              underestimate camp costs by 2x.
            </p>
            <Link to="/recruiting-events" className="eastside-btn inline-flex items-center gap-2">
              Browse ID camps →
            </Link>
          </div>
        </div>
      </AthleteLayout>
    )
  }

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
        {/* Editorial header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] text-red-500 font-bold">
            Cost transparency
          </span>
        </div>
        <h1 className="display-font text-4xl text-white mb-2">Budget Builder</h1>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          The real cost of ID camps — fee + travel + lodging + food. Estimate
          each line so you (and your parents) know what you're actually
          signing up for.
        </p>

        {/* GRAND TOTAL hero card */}
        <div className="hero-card crimson-glow-bg p-6 mb-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-secondary font-bold mb-1">
            Total budget
          </div>
          <div className="display-font text-5xl md:text-6xl text-white leading-none mb-3">
            {fmt$(totals.grandTotal)}
          </div>
          <div className="text-[12px] text-text-tertiary mb-5">
            across {camps.length} {camps.length === 1 ? 'camp' : 'camps'}
          </div>

          {/* Horizontal stacked bar — category breakdown */}
          {totals.grandTotal > 0 && (
            <>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background: '#1e293b' }}>
                {totals.byCategory.map((cat) => {
                  const pct = (cat.total / totals.grandTotal) * 100
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={cat.key}
                      style={{
                        width: `${pct}%`,
                        background: cat.color,
                      }}
                      title={`${cat.label}: ${fmt$(cat.total)}`}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                {totals.byCategory.map((cat) => {
                  if (cat.total === 0) return null
                  const pct = Math.round((cat.total / totals.grandTotal) * 100)
                  return (
                    <div key={cat.key} className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ background: cat.color }}
                      />
                      <span className="text-text-secondary">{cat.label}</span>
                      <span className="text-white font-semibold">{fmt$(cat.total)}</span>
                      <span className="text-text-tertiary">· {pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Education sidebar */}
        <div className="design-card p-4 mb-6 flex gap-3 items-start"
             style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
               style={{ background: 'rgba(251,191,36,0.15)' }}>
            <Info size={14} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="text-[12px] text-text-secondary leading-relaxed">
            <span className="font-semibold text-white">Real talk: </span>
            ECNL families spend $5,000–$10,000 per year on recruiting on top
            of regular club fees. Camps are the biggest line item after
            club dues. Travel often costs more than the camp itself —
            stacking multiple-day camps on one trip can cut your total
            in half.
          </div>
        </div>

        {/* Camps list — each expandable to edit per-line expenses */}
        <h2 className="display-font text-sm tracking-[0.06em] text-white uppercase mb-3">
          Your camps
        </h2>

        <div className="space-y-2">
          {camps.map((camp) => {
            const campTotal =
              totals.perCamp.find((p) => p.id === camp.id)?.total || 0
            const isExpanded = expandedId === camp.id
            const past = camp.camp_date && camp.camp_date <= new Date().toISOString().slice(0, 10)
            return (
              <div key={camp.id} className="design-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : camp.id)}
                  className="w-full p-4 text-left flex items-center gap-3 hover:bg-card-hover transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-900/30"
                    style={{ background: 'rgba(200,16,46,0.10)' }}
                  >
                    <Calendar size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-[14px] leading-tight truncate">
                      {camp.notes || camp.school_name}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-2">
                      {camp.camp_date && (
                        <span>{format(parseISO(camp.camp_date), 'MMM d, yyyy')}</span>
                      )}
                      {past && (
                        <span className="chip chip-green inline-flex items-center gap-1" style={{ padding: '1px 6px', fontSize: 9 }}>
                          <Trophy size={9} /> Attended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="display-font text-lg text-white">{fmt$(campTotal)}</div>
                    <div className="text-[10px] text-text-tertiary uppercase tracking-widest">
                      Total
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-text-tertiary flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-tertiary flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-card-border p-4 space-y-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      return (
                        <div key={cat.key} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${cat.color}22`, color: cat.color }}
                          >
                            <Icon size={14} />
                          </div>
                          <label className="flex-1 text-[13px] text-text-secondary">
                            {cat.label}
                          </label>
                          <div className="relative w-24 flex-shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary text-[12px]">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={camp[cat.key] || ''}
                              onChange={(e) =>
                                handleFieldChange(camp.id, cat.key, e.target.value)
                              }
                              className="form-input w-full pl-5 pr-2 py-1.5 text-right text-[13px]"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-text-tertiary mt-6 leading-relaxed">
          Estimates only — actual costs may vary. Updates save automatically
          as you type. Camp fees default to whatever the camp organizer
          published; edit them if your offer was different.
        </p>
      </div>
    </AthleteLayout>
  )
}
