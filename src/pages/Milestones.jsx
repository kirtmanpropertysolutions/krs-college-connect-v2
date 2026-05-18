/**
 * /milestones — the trophy-room deep-dive.
 *
 * The dashboard surfaces just enough gamification to drive daily
 * engagement. This page is for the kids who want to obsess: see every
 * badge, see the tier ladder, browse what's locked, plan the next
 * earnings.
 *
 * Layout, top to bottom:
 *   1. Tier ladder strip — 5 tiers shown with current highlighted
 *   2. Stats summary — total earned / next promotion / streak
 *   3. Filters — All / Earned / Locked / In progress (mobile-first pills)
 *   4. Badges grouped by tier, full grid
 *   5. Tap a badge → detail sheet with date, % of club earned, tip
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Lock, CheckCircle2, X } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/authContext'
import AthleteLayout from '../components/AthleteLayout.jsx'
import MilestoneIcon from '../components/MilestoneIcon.jsx'
import {
  loadAllMilestones,
  loadEarnedMilestones,
  getTierForCount,
  TIER_LADDER,
} from '../lib/milestones.js'

const TIER_HEADINGS = {
  onboarding: 'Onboarding',
  pipeline: 'Pipeline',
  outreach: 'Outreach',
  real_world: 'Real World',
  engagement: 'Engagement',
  production: 'Production',
}

const TIER_TAGLINES = {
  onboarding: 'Get your athlete profile usable.',
  pipeline: 'Build a real list of target schools.',
  outreach: 'Make first contact with coaches.',
  real_world: 'Camps, visits, and offers — the real moves.',
  engagement: 'Show up consistently. Recruiting is a long game.',
  production: 'Build the highlight content coaches need to see.',
}

export default function Milestones() {
  const { user } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [earned, setEarned] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | earned | locked
  const [detailMilestone, setDetailMilestone] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const [cat, ea] = await Promise.all([
        loadAllMilestones(),
        loadEarnedMilestones(user.id),
      ])
      if (cancelled) return
      setCatalog(cat)
      setEarned(ea)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const earnedMap = useMemo(
    () => new Map(earned.map((e) => [e.milestone_id, e.earned_at])),
    [earned]
  )
  const tierInfo = getTierForCount(earned.length)

  // Group milestones by tier preserving sort_order
  const byTier = useMemo(() => {
    const order = ['onboarding', 'pipeline', 'outreach', 'real_world', 'engagement', 'production']
    const map = new Map(order.map((t) => [t, []]))
    for (const m of catalog) {
      const isEarned = earnedMap.has(m.id)
      if (filter === 'earned' && !isEarned) continue
      if (filter === 'locked' && isEarned) continue
      if (map.has(m.tier)) map.get(m.tier).push(m)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order)
    return map
  }, [catalog, earnedMap, filter])

  if (loading) {
    return (
      <AthleteLayout>
        <div className="px-4 md:px-8 py-8 animate-pulse">
          <div className="h-6 bg-navy-800 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-navy-800 rounded-xl mb-6"></div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="aspect-square bg-navy-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </AthleteLayout>
    )
  }

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-white text-[12px] mb-4"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>

        {/* Editorial header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] text-red-500 font-bold">
            Trophy room
          </span>
        </div>
        <h1 className="display-font text-4xl text-white mb-5">Milestones</h1>

        {/* Tier ladder strip */}
        <div className="design-card p-4 mb-4 overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-max">
            {[...TIER_LADDER].reverse().map((t, idx, arr) => {
              const isCurrent = t.id === tierInfo.tier.id
              const isPast =
                arr.findIndex((x) => x.id === tierInfo.tier.id) > idx
              return (
                <div
                  key={t.id}
                  className="flex-1 min-w-[100px] rounded-lg px-3 py-2 border"
                  style={{
                    borderColor: isCurrent ? t.color : '#1e293b',
                    background: isCurrent
                      ? 'rgba(200,16,46,0.08)'
                      : isPast
                      ? 'rgba(15,23,41,0.6)'
                      : 'transparent',
                    opacity: !isPast && !isCurrent ? 0.55 : 1,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {isPast && <CheckCircle2 size={11} className="text-green-500" />}
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] font-bold"
                      style={{ color: isCurrent ? t.color : '#94a3b8' }}
                    >
                      {t.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-tertiary">{t.min}+ milestones</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress summary */}
        <div className="design-card p-4 mb-5 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0"
            style={{
              borderColor: tierInfo.tier.color,
              background:
                'linear-gradient(135deg, rgba(200,16,46,0.15) 0%, rgba(10,14,26,0.5) 100%)',
            }}
          >
            <Trophy size={22} style={{ color: tierInfo.tier.color }} />
          </div>
          <div className="flex-1">
            <div className="display-font text-white text-lg" style={{ color: tierInfo.tier.color }}>
              {tierInfo.tier.name}
            </div>
            <div className="text-[11px] text-text-secondary">
              {earned.length} of {catalog.length} milestones earned
              {tierInfo.next && (
                <span>
                  {' · '}
                  <span className="text-white">{tierInfo.remaining} to {tierInfo.next.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {[
            { id: 'all', label: `All ${catalog.length}` },
            { id: 'earned', label: `Earned ${earned.length}` },
            { id: 'locked', label: `Locked ${catalog.length - earned.length}` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`pill ${filter === f.id ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tier-grouped grids */}
        {Array.from(byTier.entries()).map(([tier, milestones]) => {
          if (milestones.length === 0) return null
          return (
            <div key={tier} className="mb-7">
              <div className="mb-3">
                <h3 className="display-font text-white text-lg tracking-[0.06em] uppercase">
                  {TIER_HEADINGS[tier]}
                </h3>
                <p className="text-[12px] text-text-secondary">{TIER_TAGLINES[tier]}</p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {milestones.map((m) => {
                  const isEarned = earnedMap.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => setDetailMilestone(m)}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-2 text-center border transition-colors ${
                        isEarned
                          ? 'border-red-900/40 hover:border-red-700/60'
                          : 'border-card-border opacity-60 hover:opacity-100'
                      }`}
                      style={
                        isEarned
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(10,14,26,0.5) 100%)',
                            }
                          : { background: 'rgba(15, 23, 41, 0.6)' }
                      }
                    >
                      {isEarned ? (
                        <MilestoneIcon name={m.icon} size={22} className="text-amber-400" />
                      ) : (
                        <Lock size={16} className="text-text-tertiary" />
                      )}
                      <span
                        className={`text-[9px] uppercase tracking-[0.04em] leading-tight ${
                          isEarned ? 'text-text-secondary' : 'text-text-tertiary'
                        }`}
                      >
                        {m.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestone detail sheet */}
      {detailMilestone && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4 animate-fadeIn"
          onClick={() => setDetailMilestone(null)}
        >
          <div
            className="design-card max-w-md w-full p-6 animate-slide-up-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailMilestone(null)}
              className="absolute top-4 right-4 text-text-tertiary hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl border border-red-900/40 flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(200,16,46,0.15) 0%, rgba(10,14,26,0.5) 100%)',
                }}
              >
                {earnedMap.has(detailMilestone.id) ? (
                  <MilestoneIcon
                    name={detailMilestone.icon}
                    size={24}
                    className="text-amber-400"
                  />
                ) : (
                  <Lock size={20} className="text-text-tertiary" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-bold mb-0.5">
                  {TIER_HEADINGS[detailMilestone.tier]}
                </div>
                <h3 className="display-font text-xl text-white leading-tight">
                  {detailMilestone.name}
                </h3>
              </div>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              {detailMilestone.description}
            </p>
            {earnedMap.has(detailMilestone.id) ? (
              <div
                className="rounded-lg p-3 mb-2 border border-green-700/40"
                style={{ background: 'rgba(16,185,129,0.08)' }}
              >
                <div className="flex items-center gap-2 text-green-400 text-[12px]">
                  <CheckCircle2 size={14} />
                  <span className="font-semibold">Earned</span>
                  <span className="text-text-tertiary">
                    · {format(new Date(earnedMap.get(detailMilestone.id)), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg p-3 mb-2 border border-amber-700/30" style={{ background: 'rgba(251,191,36,0.06)' }}>
                <div className="flex items-center gap-2 text-amber-400 text-[12px]">
                  <Lock size={14} />
                  <span className="font-semibold">Not yet earned</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AthleteLayout>
  )
}
