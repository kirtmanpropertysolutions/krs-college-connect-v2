/**
 * Milestone engine — Phase 2 of the gamification system.
 *
 * Two responsibilities:
 *   1. Derive the athlete's tier (Rookie → Elite) from their earned count.
 *   2. Inspect the athlete's actual recruiting state and award any
 *      newly-qualified milestones, idempotently.
 *
 * Design notes:
 *   - The catalog of milestone definitions lives in the `milestones`
 *     table. Tier thresholds are config here (subject to product tuning).
 *   - `checkAndAwardMilestones(userId)` is safe to call on every
 *     dashboard load. It runs the full sweep, but a UNIQUE constraint
 *     on (user_id, milestone_id) means double-runs are no-ops. So we
 *     don't need to track "have I checked this milestone yet" — the
 *     database does dedup for us.
 *   - Each check is wrapped to swallow its own errors so a single failed
 *     check (e.g. RLS hiccup) can't sink the whole sweep. The athlete
 *     just misses that one badge for now and picks it up next time.
 */

import { supabase } from './supabase'
import { calculateStreak } from './streaks.js'

// ─────────────────────────────────────────────────────────────────────
// Tier ladder
// ─────────────────────────────────────────────────────────────────────

/**
 * Tier thresholds. An athlete's tier is determined by their COUNT of
 * earned milestones (not the sum of points — keeps it readable).
 * Order matters: highest first so getTierForCount can short-circuit.
 */
export const TIER_LADDER = [
  { id: 'elite',        name: 'Elite',        min: 23, color: '#fbbf24' },
  { id: 'captain',      name: 'Captain',      min: 16, color: '#C8102E' },
  { id: 'starter',      name: 'Starter',      min: 10, color: '#E11A38' },
  { id: 'squad_player', name: 'Squad Player', min: 4,  color: '#94a3b8' },
  { id: 'rookie',       name: 'Rookie',       min: 0,  color: '#64748b' },
]

/**
 * Given a count of earned milestones, return the athlete's current
 * tier + their progress to the next one.
 *
 * Example: 9 earned → { tier: 'squad_player', earnedInTier: 5 of 6,
 *                       nextTier: 'starter', remaining: 1 }
 */
export function getTierForCount(count) {
  const current = TIER_LADDER.find((t) => count >= t.min) || TIER_LADDER[TIER_LADDER.length - 1]
  const currentIdx = TIER_LADDER.indexOf(current)
  const next = currentIdx > 0 ? TIER_LADDER[currentIdx - 1] : null
  const remaining = next ? Math.max(0, next.min - count) : 0
  // Progress within current tier — 0..1 fraction
  const tierFloor = current.min
  const tierCeiling = next ? next.min : tierFloor + 5
  const progress = Math.min(1, Math.max(0, (count - tierFloor) / Math.max(1, tierCeiling - tierFloor)))
  return {
    tier: current,
    next,
    remaining,
    progress,
    earnedTotal: count,
  }
}

// ─────────────────────────────────────────────────────────────────────
// Earning engine
// ─────────────────────────────────────────────────────────────────────

/**
 * Wrap a single milestone check so its failure doesn't crash the sweep.
 * Returns the check's actual value (boolean, object, or array of
 * milestone IDs depending on the check) and substitutes `null` on
 * error so the downstream .then() can handle absence cleanly.
 *
 * Previously this Boolean-wrapped every return value, which silently
 * destroyed the count objects from grouped checks (pipeline_counts,
 * outreach_counts, etc). Those checks looked correct but never
 * awarded because `true.count` is undefined and `true.count >= 1`
 * is false.
 */
async function safeCheck(label, fn) {
  try {
    return await fn()
  } catch (err) {
    console.warn(`milestone check failed [${label}]:`, err?.message || err)
    return null
  }
}

/**
 * Compute the set of milestone IDs the athlete CURRENTLY qualifies
 * for by inspecting their live data. Returns a Set<string>.
 *
 * This is the single source of truth for "what should this athlete
 * have right now?". `syncMilestones` diffs this against what's
 * already in `athlete_milestones` to figure out what to add and
 * what to revoke.
 *
 * Milestones whose qualification CAN'T be revoked (time-based
 * `first_month_active`) are included in the result whenever they
 * qualify; they're added by the sync but never removed, even if
 * future logic changes claim they no longer apply.
 */
async function getCurrentlyQualifying(userId) {
  if (!userId) return new Set()
  const qualifying = new Set()

  const checks = await Promise.all([
    safeCheck('profile_complete', async () => {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('athletes').select('position, class_year, gpa').eq('user_id', userId).maybeSingle(),
      ])
      const filled = [p?.full_name, a?.position, a?.class_year, a?.gpa].filter(Boolean).length
      return filled >= 3 ? ['profile_complete'] : []
    }),

    safeCheck('quiz_taken', async () => {
      const { data } = await supabase
        .from('school_fit_quiz_responses')
        .select('completed_at')
        .eq('user_id', userId)
        .maybeSingle()
      return data?.completed_at ? ['quiz_taken'] : []
    }),

    safeCheck('headshot_up', async () => {
      const { data } = await supabase
        .from('athletes')
        .select('profile_photo_url')
        .eq('user_id', userId)
        .maybeSingle()
      return data?.profile_photo_url ? ['headshot_up'] : []
    }),

    safeCheck('reel_linked', async () => {
      // Empty strings should NOT qualify. Treat null, undefined, and ""
      // all as "no link". Old data may have empty-string defaults from
      // earlier signup forms.
      const has = (v) => typeof v === 'string' && v.trim().length > 0
      const { count } = await supabase
        .from('highlights')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', userId)
      if ((count || 0) > 0) return ['reel_linked']
      const { data } = await supabase
        .from('athletes')
        .select('highlight_reel_url, youtube_highlights_url, veo_link_url, hudl_url')
        .eq('user_id', userId)
        .maybeSingle()
      return (
        has(data?.highlight_reel_url) ||
        has(data?.youtube_highlights_url) ||
        has(data?.veo_link_url) ||
        has(data?.hudl_url)
      )
        ? ['reel_linked']
        : []
    }),

    safeCheck('pipeline_counts', async () => {
      const { data } = await supabase
        .from('pipelines')
        .select('stage')
        .eq('athlete_id', userId)
      const count = data?.length || 0
      const uniqueStages = new Set((data || []).map((r) => r.stage).filter(Boolean)).size
      const got = []
      if (count >= 1) got.push('first_school')
      if (count >= 10) got.push('ten_schools')
      if (uniqueStages >= 3) got.push('multi_stage_pipeline')
      return got
    }),

    safeCheck('outreach_counts', async () => {
      const { data } = await supabase
        .from('outreach')
        .select('coach_replied, coach_reply_status')
        .eq('athlete_id', userId)
      const sent = data?.length || 0
      const replied = (data || []).filter((r) => r.coach_replied).length
      const positive = (data || []).filter((r) => r.coach_reply_status === 'positive').length
      const got = []
      if (sent >= 1) got.push('first_outreach')
      if (sent >= 5) got.push('five_sends')
      if (sent >= 20) got.push('twenty_sends')
      if (replied >= 1) got.push('first_reply')
      if (positive >= 1) got.push('first_positive_reply')
      return got
    }),

    safeCheck('visit_or_offer', async () => {
      const { data } = await supabase
        .from('pipelines')
        .select('stage')
        .eq('athlete_id', userId)
      const stages = new Set((data || []).map((r) => r.stage))
      const got = []
      if (stages.has('visiting')) got.push('first_visit_scheduled')
      if (stages.has('offer') || stages.has('committed')) got.push('first_offer')
      return got
    }),

    safeCheck('engagement', async () => {
      const [streak, { data: prof }] = await Promise.all([
        calculateStreak(userId),
        supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle(),
      ])
      const got = []
      if (streak >= 7) got.push('streak_7')
      if (streak >= 30) got.push('streak_30')
      if (streak >= 100) got.push('streak_100')
      if (prof?.created_at) {
        const ageMs = Date.now() - new Date(prof.created_at).getTime()
        if (ageMs >= 30 * 24 * 60 * 60 * 1000) got.push('first_month_active')
      }
      return got
    }),

    safeCheck('highlights_counts', async () => {
      const { count } = await supabase
        .from('highlights')
        .select('id', { count: 'exact', head: true })
        .eq('athlete_id', userId)
      const n = count || 0
      const got = []
      if (n >= 1) got.push('first_highlight_uploaded')
      if (n >= 3) got.push('three_highlights')
      if (n >= 10) got.push('ten_highlights')
      return got
    }),

    safeCheck('id_camps', async () => {
      // Camps the athlete has on their schedule. We award:
      //   - first_id_camp_registered when any camp is in their schedule
      //     (camp_date is in the future)
      //   - first_id_camp_attended when at least one camp's date has
      //     passed (auto-transition; no separate "attended" flag).
      // Uses the existing scheduled_camps table (athlete-owned). The
      // new id_camps table is just the admin-curated catalog.
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const { data } = await supabase
        .from('scheduled_camps')
        .select('camp_date')
        .eq('athlete_id', userId)
      const camps = data || []
      const registered = camps.length >= 1
      const attended = camps.some((c) => c.camp_date && c.camp_date <= today)
      const got = []
      if (registered) got.push('first_id_camp_registered')
      if (attended) got.push('first_id_camp_attended')
      return got
    }),
  ])

  for (const arr of checks) {
    if (!Array.isArray(arr)) continue
    for (const id of arr) qualifying.add(id)
  }
  return qualifying
}

/**
 * Milestones that should NEVER be revoked once earned. Time-based
 * achievements that can't logically be "undone". Everything else
 * mirrors current state — if the athlete no longer qualifies, the
 * badge is removed.
 */
const PERMANENT_MILESTONES = new Set(['first_month_active'])

/**
 * Sync the athlete's earned milestones with their current qualification
 * state. Inserts newly-qualified milestones, revokes ones whose
 * condition has gone away (with the PERMANENT_MILESTONES exception).
 *
 * Returns `{ awarded: [...], revoked: [...] }` so the dashboard can
 * fire toasts for awards and silently remove tiles for revokes.
 *
 * Called on every dashboard mount — idempotent.
 */
export async function checkAndAwardMilestones(userId, profileOrgId = null) {
  if (!userId) return []
  const result = await syncMilestones(userId, profileOrgId)
  // Backwards-compatible return value — callers historically expected
  // just the awarded IDs.
  return result.awarded
}

/**
 * The full sync — same logic as checkAndAwardMilestones but returns
 * both sides of the diff so newer callers can react to revocations
 * too (e.g. show a small "you no longer qualify for X" toast).
 */
export async function syncMilestones(userId, profileOrgId = null) {
  if (!userId) return { awarded: [], revoked: [] }

  const { data: already } = await supabase
    .from('athlete_milestones')
    .select('milestone_id')
    .eq('user_id', userId)
  const earnedSet = new Set((already || []).map((r) => r.milestone_id))

  const qualifyingSet = await getCurrentlyQualifying(userId)

  const toAward = [...qualifyingSet].filter((id) => !earnedSet.has(id))
  const toRevoke = [...earnedSet].filter(
    (id) => !qualifyingSet.has(id) && !PERMANENT_MILESTONES.has(id)
  )

  if (toAward.length > 0) {
    const rows = toAward.map((id) => ({
      user_id: userId,
      milestone_id: id,
      org_id: profileOrgId,
    }))
    const { error } = await supabase.from('athlete_milestones').insert(rows)
    if (error && !/duplicate key/i.test(error.message)) {
      console.warn('milestone insert error:', error.message)
    }
  }

  if (toRevoke.length > 0) {
    const { error } = await supabase
      .from('athlete_milestones')
      .delete()
      .eq('user_id', userId)
      .in('milestone_id', toRevoke)
    if (error) console.warn('milestone revoke error:', error.message)
  }

  return { awarded: toAward, revoked: toRevoke }
}

// ─────────────────────────────────────────────────────────────────────
// Data loading helpers
// ─────────────────────────────────────────────────────────────────────

/** Load the static catalog of all milestone definitions. */
export async function loadAllMilestones() {
  const { data, error } = await supabase
    .from('milestones')
    .select('id, tier, name, description, icon, points, sort_order')
    .order('sort_order')
  if (error) {
    console.warn('loadAllMilestones error:', error.message)
    return []
  }
  return data || []
}

/** Load what a single athlete has earned. */
export async function loadEarnedMilestones(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('athlete_milestones')
    .select('milestone_id, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
  if (error) {
    console.warn('loadEarnedMilestones error:', error.message)
    return []
  }
  return data || []
}
