import { supabase } from './supabase'

/**
 * Fetch an athlete's pipeline enriched with school info + per-school
 * coach count + per-school last outreach email. Used by Outreach.jsx.
 *
 * Previously this issued THREE Supabase round-trips per pipeline row:
 *   - schools .eq(name)
 *   - coaches count by school_id
 *   - outreach .eq(school) .single() for the latest email
 * On an athlete with 20 schools that was 60 sequential trips before
 * the Outreach page could render its pipeline cards.
 *
 * Now: 4 round-trips total regardless of pipeline size — one each for
 * pipelines, schools, coach counts (grouped client-side), and last
 * email per school (grouped client-side). The queries that follow the
 * first run in parallel via Promise.all.
 */
export async function getPipelineWithStats(athleteId) {
  if (!athleteId) return []

  try {
    // Step 1 — pipeline rows for this athlete
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, school, stage, created_at, updated_at')
      .eq('athlete_id', athleteId)
      .order('updated_at', { ascending: false })

    if (pipelineError) throw pipelineError
    if (!pipelines || pipelines.length === 0) return []

    const schoolNames = [...new Set(pipelines.map((p) => p.school))]

    // Step 2 — fan out three independent queries in parallel:
    //   (a) school details for all pipeline schools
    //   (b) coaches list with school_id (we count client-side)
    //   (c) outreach history for all those schools (we pick latest per
    //       school client-side; no per-school .single() round-trip)
    const [schoolsRes, schoolDetailsForCoaches, outreachRes] = await Promise.all([
      supabase
        .from('schools')
        // program_email is REQUIRED here. Without it, clicking
        // "Write to Coach" on a pipeline card hands a school object
        // to Outreach.jsx that's missing program_email — and the
        // recipient resolver then sees `{ email: null }` and blocks
        // the send even when the school does have a verified program
        // inbox. Bug surface for the May 2026 pipeline-send regression.
        .select('id, name, division, primary_color, conference, state, program_email')
        .in('name', schoolNames),
      // We need school IDs first to query coaches, but we can issue this
      // in parallel against the same data using a sub-query is awkward
      // in PostgREST. Cheapest: fetch schools twice (the row is tiny)
      // and join client-side. The second copy is just id+name so the
      // payload is negligible.
      supabase.from('schools').select('id, name').in('name', schoolNames),
      supabase
        .from('outreach')
        .select('school, sent_at, coach_name, template_type')
        .eq('athlete_id', athleteId)
        .in('school', schoolNames)
        .order('sent_at', { ascending: false }),
    ])

    const schoolByName = new Map((schoolsRes.data || []).map((s) => [s.name, s]))
    const schoolIds = (schoolDetailsForCoaches.data || []).map((s) => s.id)
    const idToName = new Map(
      (schoolDetailsForCoaches.data || []).map((s) => [s.id, s.name])
    )

    // Step 3 — one coaches query for all school IDs, count grouped
    // client-side. We can't use { count: 'exact', head: true } here
    // because we need per-school counts.
    let coachCountByName = new Map()
    if (schoolIds.length > 0) {
      const { data: coachRows } = await supabase
        .from('coaches')
        .select('school_id')
        .in('school_id', schoolIds)
      const counts = new Map()
      for (const row of coachRows || []) {
        counts.set(row.school_id, (counts.get(row.school_id) || 0) + 1)
      }
      for (const [id, c] of counts) {
        const name = idToName.get(id)
        if (name) coachCountByName.set(name, c)
      }
    }

    // Step 4 — group outreach by school, latest first (already ordered)
    const lastEmailByName = new Map()
    for (const row of outreachRes.data || []) {
      if (!lastEmailByName.has(row.school)) {
        lastEmailByName.set(row.school, row)
      }
    }

    // Step 5 — merge everything into the same shape callers expect.
    return pipelines.map((pipeline) => {
      const school = schoolByName.get(pipeline.school)
      return {
        id: pipeline.id,
        school: pipeline.school,
        stage: pipeline.stage,
        created_at: pipeline.created_at,
        updated_at: pipeline.updated_at,
        school_id: school?.id,
        division: school?.division || 'Unknown',
        primary_color: school?.primary_color || '#dc2626',
        conference: school?.conference || 'Unknown',
        state: school?.state || 'Unknown',
        // Surfaced for the outreach recipient resolver — null is fine
        // (resolver falls through to the "No verified email" state).
        program_email: school?.program_email || null,
        coach_count: coachCountByName.get(pipeline.school) || 0,
        last_email: lastEmailByName.get(pipeline.school) || null,
      }
    })
  } catch (error) {
    console.error('Error fetching pipeline with stats:', error)
    return []
  }
}
