/**
 * AthleteDashboard — gamification-first layout.
 *
 * Top to bottom, this page leads with:
 *   1. Welcome + Tier card (Rookie / Squad Player / Starter / Captain / Elite)
 *   2. Active Quests — 2-3 high-leverage next milestones with CTAs
 *   3. Recently Earned — horizontal carousel of last 3 badges
 *   4. Trophy Case preview — 8 badges, see-all link to /milestones
 *   5. Slim stats row — score / streak / schools / sends (small)
 *   6. Top Schools + Activity feed (smaller, supporting cards)
 *
 * The old recruiting-score-circle hero card is intentionally GONE. The
 * recruiting score is preserved as one chip in the small stats row,
 * tappable to open the breakdown sheet.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/authContext'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Trophy,
  ArrowRight,
  ArrowUpRight,
  Flame,
  Award,
  Lock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolDetailModal from '../components/SchoolDetailModal.jsx'
import MilestoneIcon from '../components/MilestoneIcon.jsx'
import MilestoneToast from '../components/MilestoneToast.jsx'
import TierPromotionModal from '../components/TierPromotionModal.jsx'
import OnboardingOverlay from '../components/OnboardingOverlay.jsx'
import RecruitingScoreBreakdown from '../components/RecruitingScoreBreakdown.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { calculateFitScore } from '../lib/fitScore.js'
import { calculateRecruitingScore } from '../lib/recruitingScore.js'
import { calculateStreak } from '../lib/streaks.js'
import { timeAgo } from '../lib/timeAgo.js'
import { format } from 'date-fns'
import {
  loadAllMilestones,
  loadEarnedMilestones,
  checkAndAwardMilestones,
  getTierForCount,
  TIER_LADDER,
} from '../lib/milestones.js'
import { pickActiveQuests, ctaForMilestone } from '../lib/activeQuests.js'

// ──────────────────────────────────────────────────────────────────────
// Small reusable bits
// ──────────────────────────────────────────────────────────────────────

function TopSchoolRow({ school, profile, onClick }) {
  const schoolName = school.schools?.name || school.school
  const fitScore = calculateFitScore(school.schools, null, profile)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors group"
    >
      <SchoolBadge schoolName={schoolName} size="sm" />
      <div className="flex-1 min-w-0">
        <h4 className="text-fg-primary font-medium text-[13px] truncate">{schoolName}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium text-fg-primary bg-text-muted">
            {school.schools?.division || 'D1'}
          </span>
          {fitScore && (
            <span className="text-text-tertiary text-[10px]">{fitScore}% fit</span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )
}

/** Tier card — the new dashboard hero. */
function TierCard({ tierInfo, earnedTotal, catalogTotal }) {
  if (!tierInfo) return null
  const { tier, next, remaining, progress } = tierInfo
  return (
    <Link
      to="/milestones"
      data-onboard="tier"
      className="hero-card crimson-glow-bg block px-5 py-4 mb-5 hover:scale-[1.005] transition-transform"
      aria-label="View all milestones"
    >
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border"
          style={{
            borderColor: tier.color,
            background: 'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)',
          }}
        >
          <Trophy size={26} style={{ color: tier.color }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-secondary font-bold">
            Athlete tier
          </div>
          <div
            className="display-font text-xl tracking-[0.06em] text-fg-primary leading-tight"
            style={{ color: tier.color }}
          >
            {tier.name}
          </div>
        </div>
        <ArrowUpRight size={16} className="text-text-tertiary flex-shrink-0" />
      </div>
      <div className="mt-3">
        <div className="h-1 bg-navy-800 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(4, Math.round(progress * 100))}%`,
              background: `linear-gradient(90deg, #C8102E 0%, ${tier.color} 100%)`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px]">
          <span className="text-text-secondary">
            {earnedTotal} of {catalogTotal} milestones
          </span>
          <span className="text-fg-primary font-medium">
            {next ? `${remaining} to ${next.name}` : 'All tiers earned'}
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Active quest card — surfaces the next high-leverage action.
    The `hint` eyebrow on milestone explains WHY this quest was picked
    (e.g. "Onboarding", "Big unlock", "8 of 10") — algorithm visible
    to the athlete instead of feeling random. */
function QuestCard({ milestone, index = 0 }) {
  const cta = ctaForMilestone(milestone.id)
  const progress = milestone.progress
  const eyebrow = milestone.hint || 'Next up'
  return (
    <Link
      to={cta.href}
      className="design-card p-4 flex items-start gap-3 hover:border-red-700/40 transition-colors group quest-fadein"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-900/30"
        style={{ background: 'rgba(200,16,46,0.12)' }}
      >
        <MilestoneIcon name={milestone.icon} size={18} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] text-amber-400 font-bold mb-0.5">
          {eyebrow}
        </div>
        <div className="text-fg-primary font-semibold text-[14px] leading-tight mb-1">
          {milestone.name}
        </div>
        <div className="text-text-secondary text-[12px] leading-snug mb-2">
          {milestone.description}
        </div>
        {progress && (
          <div className="mb-2">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div
                className="h-full bg-red-600 rounded-full"
                style={{ width: `${Math.round((progress.current / progress.target) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-text-tertiary mt-1">
              {progress.current} of {progress.target}
            </div>
          </div>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-semibold">
          {cta.label} <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  )
}

/** Trophy preview tile — used in the dashboard's 4×2 grid.
    Earned tiles get a subtle pulsing crimson glow via .trophy-earned-glow
    so they read as living, not flat. */
function TrophyTile({ milestone, earned }) {
  return (
    <Link
      to="/milestones"
      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-2 text-center border transition-colors ${
        earned
          ? 'border-red-900/40 trophy-earned-glow'
          : 'border-card-border opacity-60 hover:opacity-100'
      }`}
      style={
        earned
          ? {
              background:
                'linear-gradient(135deg, rgba(200,16,46,0.12) 0%, rgba(10,14,26,0.5) 100%)',
            }
          : { background: 'rgba(15, 23, 41, 0.6)' }
      }
      aria-label={`${milestone.name} — ${earned ? 'earned' : 'locked'}`}
    >
      {earned ? (
        <MilestoneIcon name={milestone.icon} size={20} className="text-amber-400" />
      ) : (
        <Lock size={14} className="text-text-tertiary" />
      )}
      <span
        className={`text-[9px] uppercase tracking-[0.04em] leading-tight ${
          earned ? 'text-text-secondary' : 'text-text-tertiary'
        }`}
      >
        {milestone.name}
      </span>
    </Link>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Main dashboard
// ──────────────────────────────────────────────────────────────────────

export default function AthleteDashboard() {
  const { user, profile } = useAuth()
  const orgId = profile?.org_id
  const [loading, setLoading] = useState(true)

  // Existing data
  const [pipelineCount, setPipelineCount] = useState(0)
  const [recentSchools, setRecentSchools] = useState([])
  const [activities, setActivities] = useState([])
  const [recruitingScore, setRecruitingScore] = useState({ score: 0, breakdown: {} })
  const [streak, setStreak] = useState(0)
  const [recentEmailsSent, setRecentEmailsSent] = useState(0)
  const [highlightsCount, setHighlightsCount] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState(null)

  // Gamification state
  const [catalog, setCatalog] = useState([])
  const [earned, setEarned] = useState([])
  // Toast queue — milestones earned this load, popped one at a time
  const [toastQueue, setToastQueue] = useState([])
  // Tier promotion modal — set when the load run promotes the athlete
  const [tierPromotion, setTierPromotion] = useState(null)

  const loadDashboardData = useCallback(async (userId) => {
    if (!userId) return

    try {
      // Pre-load existing dashboard data in parallel
      const [pipelineRes, recentRes, emailsRes, hlRes, activityRes, streakResult, scoreResult] =
        await Promise.all([
          supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('athlete_id', userId),
          supabase.from('pipelines').select('*').eq('athlete_id', userId).order('updated_at', { ascending: false }).limit(3),
          supabase
            .from('outreach')
            .select('id', { count: 'exact', head: true })
            .eq('athlete_id', userId)
            .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('highlights').select('id', { count: 'exact', head: true }).eq('athlete_id', userId),
          supabase.from('recruiting_activity').select('*').eq('athlete_id', userId).order('created_at', { ascending: false }).limit(5),
          calculateStreak(userId),
          calculateRecruitingScore(userId),
        ])

      setPipelineCount(pipelineRes.count || 0)
      setRecentEmailsSent(emailsRes.count || 0)
      setHighlightsCount(hlRes.count || 0)
      setActivities(activityRes.data || [])
      setStreak(streakResult)
      setRecruitingScore(scoreResult)

      // Hydrate school details on recent pipeline rows.
      // CRITICAL: include `id` in the select. SchoolDetailModal's
      // auto-coach-load effect early-returns if `school.id` is
      // undefined — without the id the modal would show stale
      // coaches from whichever school was opened previously.
      //
      // Batched: one `.in()` query for all recent pipeline rows
      // instead of one round-trip per school (the previous loop was
      // an N+1; on a 3-school dashboard it was 3 sequential trips).
      const recentPipelines = recentRes.data || []
      let pipelinesWithSchools = []
      if (recentPipelines.length > 0) {
        const schoolNames = recentPipelines.map((p) => p.school)
        const { data: schoolsData } = await supabase
          .from('schools')
          .select('id, name, division, primary_color, conference, state')
          .in('name', schoolNames)
        const byName = new Map((schoolsData || []).map((s) => [s.name, s]))
        pipelinesWithSchools = recentPipelines.map((pipeline) => ({
          ...pipeline,
          schools: byName.get(pipeline.school) || { name: pipeline.school },
        }))
      }
      setRecentSchools(pipelinesWithSchools)

      // Gamification — show the catalog + earned milestones IMMEDIATELY
      // so the tier card + trophy case render with real data on first
      // paint, then defer the engine sweep (which makes many more
      // queries) until after the page is interactive. This trades
      // ~0.5s of new-badge detection lag for a snappier-feeling load.
      const [catalogRes, earnedBefore] = await Promise.all([
        loadAllMilestones(),
        loadEarnedMilestones(userId),
      ])
      setCatalog(catalogRes)
      setEarned(earnedBefore)

      const tierBefore = getTierForCount(earnedBefore.length).tier.id

      setTimeout(async () => {
        try {
          const newlyEarned = await checkAndAwardMilestones(userId, orgId)
          if (newlyEarned.length === 0) return

          const earnedAfter = await loadEarnedMilestones(userId)
          setEarned(earnedAfter)

          const newToasts = newlyEarned
            .map((id) => catalogRes.find((c) => c.id === id))
            .filter(Boolean)
          setToastQueue(newToasts)

          const tierAfter = getTierForCount(earnedAfter.length)
          if (tierAfter.tier.id !== tierBefore && tierAfter.tier.min > 0) {
            setTierPromotion(tierAfter.tier)
          }
        } catch (err) {
          console.warn('deferred milestone sweep failed:', err)
        }
      }, 400)
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    // Sync-with-external-state: load dashboard data from Supabase whenever the user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.id) loadDashboardData(user.id)
  }, [user?.id, loadDashboardData])

  // ── Derived view state ──────────────────────────────────────────────
  const earnedSet = new Set(earned.map((e) => e.milestone_id))
  const tierInfo = getTierForCount(earned.length)
  const activeQuests = pickActiveQuests(catalog, earnedSet, {
    pipelineCount,
    sendsCount: recentEmailsSent,
    highlightsCount,
    streak,
  })
  // Trophy case preview — pull earned ones first, then locked, take 8
  const earnedDates = new Map(earned.map((e) => [e.milestone_id, e.earned_at]))
  const sortedForPreview = [...catalog].sort((a, b) => {
    const aE = earnedSet.has(a.id) ? 0 : 1
    const bE = earnedSet.has(b.id) ? 0 : 1
    if (aE !== bE) return aE - bE
    return a.sort_order - b.sort_order
  })
  const trophyPreview = sortedForPreview.slice(0, 8)
  const recentlyEarned = [...earned]
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
    .slice(0, 3)
    .map((e) => ({ ...e, def: catalog.find((c) => c.id === e.milestone_id) }))
    .filter((e) => e.def)

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Athlete'

  if (loading) {
    return (
      <AthleteLayout>
        <div className="px-4 md:px-8 py-8 animate-pulse">
          <div className="h-6 bg-navy-800 rounded w-1/3 mb-3"></div>
          <div className="h-9 bg-navy-800 rounded w-1/2 mb-6"></div>
          <div className="h-24 bg-navy-800 rounded-xl mb-5"></div>
          <div className="grid grid-cols-1 gap-2 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-navy-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </AthleteLayout>
    )
  }

  // Toast queue mechanics — render the head of the queue, pop on dismiss
  const currentToast = toastQueue[0]
  const dismissToast = () => setToastQueue((q) => q.slice(1))

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-6">
        {/* Welcome */}
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-bold mb-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </div>
          <h1 className="display-font text-3xl text-fg-primary">Hey, {firstName}.</h1>
        </div>

        {/* Tier card */}
        <TierCard
          tierInfo={tierInfo}
          earnedTotal={earned.length}
          catalogTotal={catalog.length}
        />

        {/* Active quests */}
        {activeQuests.length > 0 && (
          <div className="mb-6" data-onboard="quests">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="display-font text-base tracking-[0.06em] text-fg-primary uppercase">
                Active quests
              </h2>
              <span className="text-[11px] text-text-tertiary">{activeQuests.length} this week</span>
            </div>
            <div className="space-y-2">
              {activeQuests.map((q, i) => (
                <QuestCard key={q.id} milestone={q} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Recently earned */}
        {recentlyEarned.length > 0 && (
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="display-font text-base tracking-[0.06em] text-fg-primary uppercase">
                Recently earned
              </h2>
              <Link to="/milestones" className="text-[11px] text-text-secondary hover:text-fg-primary">
                See all →
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {recentlyEarned.map(({ def, earned_at }) => (
                <div
                  key={def.id}
                  className="flex-shrink-0 min-w-[150px] design-card p-3"
                  style={{ borderColor: 'rgba(200,16,46,0.30)' }}
                >
                  <div className="flex items-center gap-2 mb-2 text-amber-400 text-[10px] uppercase tracking-[0.14em] font-bold">
                    <Trophy size={11} /> Earned
                  </div>
                  <div className="text-fg-primary font-semibold text-[12px] leading-tight mb-1">
                    {def.name}
                  </div>
                  <div className="text-text-tertiary text-[10px]">
                    {format(new Date(earned_at), 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trophy case preview */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="display-font text-base tracking-[0.06em] text-fg-primary uppercase">
              Trophy case
            </h2>
            <Link to="/milestones" className="text-[11px] text-text-secondary hover:text-fg-primary">
              {earned.length} / {catalog.length} →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {trophyPreview.map((m) => (
              <TrophyTile
                key={m.id}
                milestone={m}
                earned={earnedSet.has(m.id)}
                earnedAt={earnedDates.get(m.id)}
              />
            ))}
          </div>
        </div>

        {/* Slim stats row — recruiting score, streak, schools, sends */}
        <div className="grid grid-cols-4 gap-2 mb-6 pt-4 border-t border-card-border">
          <button
            onClick={() => setShowBreakdown(true)}
            className="design-card p-3 text-center hover:bg-card-hover transition-colors"
            aria-label="View recruiting score breakdown"
          >
            <div className="text-[9px] uppercase tracking-[0.10em] text-text-tertiary font-bold">
              Score
            </div>
            <div className="display-font text-xl text-red-500 leading-none mt-1">
              {recruitingScore.score}
              <span className="text-[10px] text-text-secondary font-normal ml-0.5">/100</span>
            </div>
          </button>
          <div className="design-card p-3 text-center">
            <div className="text-[9px] uppercase tracking-[0.10em] text-text-tertiary font-bold">
              Streak
            </div>
            <div className="display-font text-xl text-fg-primary leading-none mt-1 flex items-center justify-center gap-1">
              <Flame
                size={13}
                className={`text-amber-400 ${streak > 0 ? 'flame-flicker' : ''}`}
              />
              {streak}d
            </div>
          </div>
          <Link to="/my-schools" className="design-card p-3 text-center block hover:bg-card-hover transition-colors">
            <div className="text-[9px] uppercase tracking-[0.10em] text-text-tertiary font-bold">
              Schools
            </div>
            <div className="display-font text-xl text-fg-primary leading-none mt-1">
              {pipelineCount}
            </div>
          </Link>
          <Link to="/outreach" className="design-card p-3 text-center block hover:bg-card-hover transition-colors">
            <div className="text-[9px] uppercase tracking-[0.10em] text-text-tertiary font-bold">
              Sends
            </div>
            <div className="display-font text-xl text-fg-primary leading-none mt-1">
              {recentEmailsSent}
            </div>
          </Link>
        </div>

        {/* Supporting cards — Top Schools + Activity (smaller, side-by-side on md+) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="design-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="display-font text-sm tracking-[0.06em] text-fg-primary uppercase">
                Top schools
              </h3>
              <Link to="/my-schools" className="text-[11px] text-text-secondary hover:text-fg-primary">
                All {pipelineCount} →
              </Link>
            </div>
            {recentSchools.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-text-secondary text-[12px] mb-3">No schools yet.</p>
                <Link to="/coach-finder" className="text-amber-400 text-[11px] hover:text-fg-primary">
                  FIND SCHOOLS →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentSchools.slice(0, 3).map((school) => (
                  <TopSchoolRow
                    key={school.id}
                    school={school}
                    profile={profile}
                    onClick={() => setSelectedSchool(school)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="design-card p-4">
            <h3 className="display-font text-sm tracking-[0.06em] text-fg-primary uppercase mb-3">
              Recent activity
            </h3>
            {activities.length === 0 ? (
              <p className="text-text-secondary text-[12px]">
                Your recruiting activity will show up here.
              </p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <Award size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-[12px] text-text-secondary leading-snug">
                      {(a.activity_data?.school_name || 'Activity')} · {timeAgo(a.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* First-time walkthrough — only renders on the user's first
          dashboard load (tracked in localStorage). Spotlights the
          tier card → active quests → profile tab in order. */}
      <OnboardingOverlay />

      {/* Celebrations */}
      {currentToast && (
        <MilestoneToast milestone={currentToast} onDismiss={dismissToast} />
      )}
      {tierPromotion && (
        <TierPromotionModal tier={tierPromotion} onClose={() => setTierPromotion(null)} />
      )}

      {/* Recruiting score breakdown */}
      {showBreakdown && (
        <RecruitingScoreBreakdown
          score={recruitingScore.score}
          breakdown={recruitingScore.breakdown}
          onClose={() => setShowBreakdown(false)}
        />
      )}

      {/* School detail modal — same one used elsewhere */}
      {selectedSchool && (
        <SchoolDetailModal
          school={selectedSchool.schools || { name: selectedSchool.school }}
          isOpen={true}
          onClose={() => setSelectedSchool(null)}
          athleteProfile={profile}
          isInPipeline={true}
          fitScore={calculateFitScore(selectedSchool.schools, null, profile)}
        />
      )}
    </AthleteLayout>
  )
}
