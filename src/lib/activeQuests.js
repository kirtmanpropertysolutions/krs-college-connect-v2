/**
 * Active-quest picker.
 *
 * Decides which 2–3 milestones to surface as "Active Quests" on the
 * dashboard. The picker prioritizes:
 *
 *   1. Onboarding completion first. Until profile/quiz/headshot are
 *      done, the rest of the platform's value is locked, so we always
 *      surface unfinished onboarding before anything else.
 *   2. The next tier the athlete is closest to completing. If they've
 *      done all of onboarding + pipeline, push them on outreach next.
 *   3. Within a tier, sort by point value (higher = more impactful)
 *      then by sort_order.
 *
 * Quests carry a numeric progress estimate when applicable (e.g.
 * "7 of 10 schools"), computed by `progressForMilestone(...)` against
 * the dashboard's already-loaded counts so we don't have to make new
 * DB calls.
 */

const TIER_ORDER = [
  'onboarding',
  'pipeline',
  'outreach',
  'engagement',
  'real_world',
  'production',
]

/**
 * Pick up to N active quests for the athlete.
 *
 * Logic, in order:
 *
 *   1. **Starter pack for brand-new athletes.** If the athlete has 0
 *      earned milestones, hand-pick the 3 onboarding quests in the
 *      order that makes sense as an entry ramp (profile → quiz →
 *      photo). Skips the algorithm entirely so first-timers see a
 *      coherent flow, not a noisy mix of "First Outreach" and
 *      "Quiz Taken" jammed together.
 *
 *   2. **"Almost there" boost.** For every locked milestone with a
 *      numeric threshold (10 schools, 5 sends, 30-day streak), if the
 *      athlete is ≥50% of the way there, treat it as high-priority.
 *      This is the most motivating quest type — they can see the
 *      finish line.
 *
 *   3. **Tier-order fallback.** Walk onboarding → pipeline → outreach
 *      → engagement → real-world → production, pulling the locked
 *      milestone with the highest point value in each tier until we
 *      hit the cap.
 *
 *   4. **Annotate each quest with `hint`**, a short eyebrow string the
 *      UI shows above the title ("You're 8 of 10", "Big unlock",
 *      "Onboarding"). Makes the algorithm visible to athletes so they
 *      know WHY a quest is being suggested.
 *
 * @param {Array}  catalog
 * @param {Set}    earnedIds
 * @param {object} stats
 * @param {number} [max=3]
 * @returns {Array}
 */
export function pickActiveQuests(catalog, earnedIds, stats = {}, max = 3) {
  const locked = (catalog || []).filter((m) => !earnedIds.has(m.id))
  if (locked.length === 0) return []

  // ── 1. Starter pack for brand-new athletes
  if (earnedIds.size === 0) {
    const starterIds = ['profile_complete', 'quiz_taken', 'headshot_up']
    const starters = starterIds
      .map((id) => locked.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, max)
      .map((m) => ({
        ...m,
        progress: progressForMilestone(m, stats),
        hint: 'Onboarding',
      }))
    if (starters.length >= max) return starters
    // Fall through to fill remaining slots from the regular algorithm,
    // skipping ones we already added.
    const starterSet = new Set(starters.map((s) => s.id))
    const rest = pickByPriority(
      locked.filter((m) => !starterSet.has(m.id)),
      stats,
      max - starters.length
    )
    return [...starters, ...rest]
  }

  return pickByPriority(locked, stats, max)
}

/**
 * The tier-priority + "almost there" picker. Used both as the main
 * algorithm and as the fallback after the starter-pack short-circuit.
 */
function pickByPriority(locked, stats, max) {
  // ── 2. "Almost there" candidates — counting milestones the athlete
  // is at least halfway through. These get top placement so kids see
  // the finish line.
  const almostThere = []
  for (const m of locked) {
    const p = progressForMilestone(m, stats)
    if (p && p.current >= p.target * 0.5 && p.current < p.target) {
      const pct = Math.round((p.current / p.target) * 100)
      almostThere.push({
        ...m,
        progress: p,
        hint: `${p.current} of ${p.target}`,
        _almostScore: pct, // for sorting
      })
    }
  }
  almostThere.sort((a, b) => b._almostScore - a._almostScore)
  const picked = almostThere.slice(0, max).map((m) => {
    const { _almostScore, ...rest } = m
    return rest
  })

  if (picked.length >= max) return picked

  // ── 3. Tier-order fallback. Group remaining locked by tier, sort
  // within tier by points desc, walk the tier order, pull one at a time.
  const pickedIds = new Set(picked.map((p) => p.id))
  const byTier = new Map()
  for (const m of locked) {
    if (pickedIds.has(m.id)) continue
    if (!byTier.has(m.tier)) byTier.set(m.tier, [])
    byTier.get(m.tier).push(m)
  }
  for (const arr of byTier.values()) {
    arr.sort((a, b) => b.points - a.points || a.sort_order - b.sort_order)
  }

  for (const tier of TIER_ORDER) {
    const tierLocked = byTier.get(tier) || []
    for (const m of tierLocked) {
      if (picked.length >= max) break
      picked.push({
        ...m,
        progress: progressForMilestone(m, stats),
        hint: tierHintFor(tier, m.points),
      })
    }
    if (picked.length >= max) break
  }
  return picked
}

/**
 * Eyebrow label for the tier-fallback quests. High-point milestones
 * read as "Big unlock" so the athlete understands why it's prioritized.
 */
function tierHintFor(tier, points) {
  if (points >= 3) return 'Big unlock'
  const map = {
    onboarding: 'Onboarding',
    pipeline: 'Pipeline',
    outreach: 'Outreach',
    real_world: 'Real world',
    engagement: 'Engagement',
    production: 'Highlights',
  }
  return map[tier] || 'Next up'
}

/**
 * Estimate progress on a counting-style milestone using stats already
 * loaded on the dashboard. Returns null for binary milestones (you
 * either have it or you don't) so the UI can omit the progress bar.
 */
function progressForMilestone(m, stats) {
  switch (m.id) {
    case 'ten_schools':
      return { current: Math.min(stats.pipelineCount || 0, 10), target: 10 }
    case 'five_sends':
      return { current: Math.min(stats.sendsCount || 0, 5), target: 5 }
    case 'twenty_sends':
      return { current: Math.min(stats.sendsCount || 0, 20), target: 20 }
    case 'three_highlights':
      return { current: Math.min(stats.highlightsCount || 0, 3), target: 3 }
    case 'ten_highlights':
      return { current: Math.min(stats.highlightsCount || 0, 10), target: 10 }
    case 'streak_7':
      return { current: Math.min(stats.streak || 0, 7), target: 7 }
    case 'streak_30':
      return { current: Math.min(stats.streak || 0, 30), target: 30 }
    case 'streak_100':
      return { current: Math.min(stats.streak || 0, 100), target: 100 }
    default:
      return null
  }
}

/**
 * The most relevant CTA route for a given milestone — used by the
 * Active Quest cards to give every quest a "Do it now" button that
 * jumps to the right page.
 */
export function ctaForMilestone(id) {
  const map = {
    profile_complete: { href: '/profile', label: 'Open profile' },
    quiz_taken: { href: '/school-fit-quiz', label: 'Take the quiz' },
    headshot_up: { href: '/profile', label: 'Upload photo' },
    reel_linked: { href: '/highlights', label: 'Add a video' },
    first_school: { href: '/coach-finder', label: 'Find schools' },
    ten_schools: { href: '/coach-finder', label: 'Add more schools' },
    multi_stage_pipeline: { href: '/my-schools', label: 'Move schools forward' },
    first_outreach: { href: '/outreach', label: 'Compose email' },
    first_reply: { href: '/outreach', label: 'Log a reply' },
    five_sends: { href: '/outreach', label: 'Send more emails' },
    twenty_sends: { href: '/outreach', label: 'Keep sending' },
    first_positive_reply: { href: '/outreach', label: 'Log a positive reply' },
    first_id_camp_registered: { href: '/recruiting-events', label: 'Browse camps' },
    first_id_camp_attended: { href: '/recruiting-events', label: 'Mark camp attended' },
    first_visit_scheduled: { href: '/my-schools', label: 'Schedule a visit' },
    first_offer: { href: '/my-schools', label: 'Log an offer' },
    first_highlight_uploaded: { href: '/highlights', label: 'Upload video' },
    three_highlights: { href: '/highlights', label: 'Upload more' },
    ten_highlights: { href: '/highlights', label: 'Build your reel' },
  }
  return map[id] || { href: '/', label: 'Continue' }
}
