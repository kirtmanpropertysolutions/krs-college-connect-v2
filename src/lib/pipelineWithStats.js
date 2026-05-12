import { supabase } from './supabase'

export async function getPipelineWithStats(athleteId) {
  if (!athleteId) return []

  try {
    // Step 1: Get all pipeline schools for this athlete
    const { data: pipelines, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, school, stage, created_at, updated_at')
      .eq('athlete_id', athleteId)
      .order('updated_at', { ascending: false })

    if (pipelineError) throw pipelineError
    if (!pipelines || pipelines.length === 0) return []

    // Step 2: For each pipeline school, fetch enriched data
    const enrichedPipelines = await Promise.all(
      pipelines.map(async (pipeline) => {
        // Get school details
        const { data: school } = await supabase
          .from('schools')
          .select('id, name, division, primary_color, conference, state')
          .eq('name', pipeline.school)
          .single()

        // Get coach count for this school
        const { count: coachCount } = await supabase
          .from('coaches')
          .select('id', { count: 'exact' })
          .eq('school', pipeline.school)

        // Get last email sent to this school
        const { data: lastEmail } = await supabase
          .from('outreach')
          .select('sent_at, coach_name, template_type')
          .eq('athlete_id', athleteId)
          .eq('school', pipeline.school)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: pipeline.id,
          school: pipeline.school,
          stage: pipeline.stage,
          created_at: pipeline.created_at,
          updated_at: pipeline.updated_at,
          // School details
          school_id: school?.id,
          division: school?.division || 'Unknown',
          primary_color: school?.primary_color || '#dc2626',
          conference: school?.conference || 'Unknown',
          state: school?.state || 'Unknown',
          // Stats
          coach_count: coachCount || 0,
          last_email: lastEmail || null
        }
      })
    )

    return enrichedPipelines
  } catch (error) {
    console.error('Error fetching pipeline with stats:', error)
    return []
  }
}